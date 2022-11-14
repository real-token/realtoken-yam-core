import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  makeSuite,
  makeSuiteWhitelistAndCreateOffer,
} from "./helpers/make-suite";
import { ZERO_ADDRESS } from "../helpers/constants";
import {
  AMOUNT_OFFER_STABLE_1,
  AMOUNT_OFFER_STABLE_2,
  PRICE_STABLE_1,
  PRICE_STABLE_2,
} from "./helpers/constants";
import { BigNumber } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("4. RealTokenYamUpgradeable user function without permit", function () {
  describe("4.1. CreateOfferBatch", function () {
    it("CreateOfferBatch: should create an offer when both tokens are whitelisted", async function () {
      const { usdcRealT, usdcTokenTest, realTokenYamUpgradeable, admin } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await expect(
        realTokenYamUpgradeable.toggleWhitelistWithType(
          [usdcRealT.address, usdcTokenTest.address],
          [3, 3]
        )
      )
        .to.emit(realTokenYamUpgradeable, "TokenWhitelistWithTypeToggled")
        .withArgs([usdcRealT.address, usdcTokenTest.address], [3, 3]).to.not
        .reverted;

      await expect(
        realTokenYamUpgradeable.createOfferBatch(
          [usdcRealT.address, usdcRealT.address],
          [usdcTokenTest.address, usdcRealT.address],
          [ZERO_ADDRESS, ZERO_ADDRESS],
          [PRICE_STABLE_1, PRICE_STABLE_2],
          [AMOUNT_OFFER_STABLE_1, AMOUNT_OFFER_STABLE_2]
        )
      )
        .to.emit(realTokenYamUpgradeable, "OfferCreated")
        .withArgs(
          usdcRealT.address,
          usdcTokenTest.address,
          admin.address,
          ZERO_ADDRESS,
          2,
          PRICE_STABLE_1,
          AMOUNT_OFFER_STABLE_1
        );

      await expect(
        realTokenYamUpgradeable.createOfferBatch(
          [usdcRealT.address, usdcRealT.address],
          [usdcTokenTest.address, usdcRealT.address],
          [ZERO_ADDRESS],
          [PRICE_STABLE_1, PRICE_STABLE_2],
          [AMOUNT_OFFER_STABLE_1, AMOUNT_OFFER_STABLE_2]
        )
      ).to.revertedWith("length mismatch");
    });
  });

  describe("4.2. Update Offer Batch", function () {
    it("Update offer batch: seller should be able to update the offer", async function () {
      const { usdcTokenTest, usdcRealT, realTokenYamUpgradeable, user1 } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await expect(
        realTokenYamUpgradeable
          .connect(user1)
          .updateOfferBatch([0], [PRICE_STABLE_2], [AMOUNT_OFFER_STABLE_2])
      )
        .to.emit(realTokenYamUpgradeable, "OfferUpdated")
        .withArgs(
          0,
          PRICE_STABLE_1, // old price
          PRICE_STABLE_2, // new price
          AMOUNT_OFFER_STABLE_1, // old amount
          AMOUNT_OFFER_STABLE_2 // new amount
        );

      expect(
        (await realTokenYamUpgradeable.getInitialOffer(0)).slice(0, 6)
      ).to.eql([
        usdcRealT.address,
        usdcTokenTest.address,
        user1.address,
        ZERO_ADDRESS,
        PRICE_STABLE_2,
        AMOUNT_OFFER_STABLE_2,
      ]);

      await expect(
        realTokenYamUpgradeable
          .connect(user1)
          .updateOfferBatch([0, 1], [PRICE_STABLE_2], [AMOUNT_OFFER_STABLE_2])
      ).to.revertedWith("length mismatch");
    });

    it("Update offer batch: non-seller should not be able to update the offer", async function () {
      const { realTokenYamUpgradeable, user2 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Revert when user 2 modifies the price of the offer, offerId = 0
      await expect(
        realTokenYamUpgradeable
          .connect(user2)
          .updateOfferBatch([0], [PRICE_STABLE_2], [AMOUNT_OFFER_STABLE_2])
      ).to.revertedWith("only the seller can change offer");
    });
  });

  describe("4.3. Delete Offer Batch", function () {
    it("Delete Offer Batch: seller should be able to delete the offer", async function () {
      const { realTokenYamUpgradeable, user1 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Emit the "OfferDeleted" event when user 1 deletes the price of the offer, offerId = 0
      await expect(realTokenYamUpgradeable.connect(user1).deleteOfferBatch([0]))
        .to.emit(realTokenYamUpgradeable, "OfferDeleted")
        .withArgs(0);
    });

    it("Delete Offer Batch: non-seller should not be able to delete offer", async function () {
      const { realTokenYamUpgradeable, user2 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Revert when user 2 deletes the offer, offerId = 0
      await expect(
        realTokenYamUpgradeable.connect(user2).deleteOfferBatch([0])
      ).to.revertedWith("only the seller can delete offer");
    });
  });

  describe("4.4. BuyOfferBatch function with checking transfer validity", function () {
    it("Function buyOfferBatch: should revert when price is wrong", async function () {
      const { realTokenYamUpgradeable, user2 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      await expect(
        realTokenYamUpgradeable
          .connect(user2)
          .buyOfferBatch([0], [PRICE_STABLE_2], [1000000]) // price was PRICE_STABLE_1
      ).to.revertedWith("offer price wrong");
    });

    it("Function buyOfferBatch: should work", async function () {
      const {
        usdcRealT,
        usdcTokenTest,
        realTokenYamUpgradeable,
        user1,
        user2,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);
      // User1 creates offer, user2 buys
      // User1 had 1000 BTT
      // User2 had 1000 USDC
      // Manipulate time to unlockTime
      await time.increaseTo(unlockTime);
      await expect(
        realTokenYamUpgradeable
          .connect(user2)
          .buyOfferBatch(
            [0, 1],
            [PRICE_STABLE_1, PRICE_STABLE_1],
            [BigNumber.from("100000000"), BigNumber.from("100000000")]
          ) // buy 100 USDCRealT
      )
        .to.emit(realTokenYamUpgradeable, "OfferAccepted")
        .withArgs(
          0,
          user1.address,
          user2.address,
          usdcRealT.address,
          usdcTokenTest.address,
          PRICE_STABLE_1,
          BigNumber.from("100000000")
        );

      console.log(
        "User1 USDCTokenTest balance: ",
        await usdcTokenTest.balanceOf(user1.address)
      );

      console.log(
        "User2 USDCRealT balance: ",
        await usdcRealT.balanceOf(user2.address)
      );

      await expect(
        realTokenYamUpgradeable
          .connect(user2)
          .buyOfferBatch(
            [0],
            [PRICE_STABLE_1, PRICE_STABLE_1],
            [BigNumber.from("100000000"), BigNumber.from("100000000")]
          ) // buy 100 USDCRealT
      ).to.revertedWith("length mismatch");
    });
  });
});
