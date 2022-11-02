import { expect } from "chai";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  makeSuite,
  makeSuiteWhitelist,
  makeSuiteWhitelistAndCreateOffer,
} from "./helpers/make-suite";
import { ZERO_ADDRESS } from "../helpers/constants";
const stableRate = 1000000;

describe("4. RealTokenYamUpgradeable user function without permit", function () {
  describe("4.1. Create/Update/Delete Offer", function () {
    it("Create Offer: should create an offer when both tokens are whitelisted", async function () {
      const { usdcRealT, usdcTokenTest, realTokenYamUpgradeable, admin } =
        await loadFixture(makeSuite);

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
        realTokenYamUpgradeable.createOffer(
          usdcRealT.address,
          usdcTokenTest.address,
          ZERO_ADDRESS,
          10,
          BigNumber.from("1000000000000000000000")
        )
      )
        .to.emit(realTokenYamUpgradeable, "OfferCreated")
        .withArgs(
          usdcRealT.address,
          usdcTokenTest.address,
          admin.address,
          ZERO_ADDRESS,
          0,
          10,
          BigNumber.from("1000000000000000000000")
        );

      await expect(
        realTokenYamUpgradeable.createOffer(
          usdcRealT.address,
          usdcTokenTest.address,
          ZERO_ADDRESS,
          15,
          BigNumber.from("1000000000000000000000")
        )
      )
        .to.emit(realTokenYamUpgradeable, "OfferCreated")
        .withArgs(
          usdcRealT.address,
          usdcTokenTest.address,
          admin.address,
          ZERO_ADDRESS,
          1,
          15,
          BigNumber.from("1000000000000000000000")
        );
    });

    it("Create Offer: should revert when the tokens are not whitelisted", async function () {
      const { usdcRealT, usdcTokenTest, realTokenYamUpgradeable } =
        await loadFixture(makeSuite);

      await expect(
        realTokenYamUpgradeable.createOffer(
          usdcRealT.address,
          usdcTokenTest.address,
          ZERO_ADDRESS,
          10,
          BigNumber.from("1000000000000000000000")
        )
      ).to.be.revertedWith("Token is not whitelisted");
    });
  });

  describe("4.2. Update Offer", function () {
    it("Update offer: seller should be able to update the offer", async function () {
      const { usdcTokenTest, usdcRealT, realTokenYamUpgradeable, user1 } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);
      await expect(
        realTokenYamUpgradeable
          .connect(user1)
          .updateOffer(0, 100, BigNumber.from("2000000000000000000000"))
      )
        .to.emit(realTokenYamUpgradeable, "OfferUpdated")
        .withArgs(
          0,
          stableRate, // old price
          100, // new price
          BigNumber.from("1000000000000000000000"), // old amount
          BigNumber.from("2000000000000000000000") // new amount
        );
      expect(
        (await realTokenYamUpgradeable.getInitialOffer(0)).slice(0, 6)
      ).to.eql([
        usdcRealT.address,
        usdcTokenTest.address,
        user1.address,
        ZERO_ADDRESS,
        BigNumber.from(100),
        BigNumber.from("2000000000000000000000"),
      ]);
    });

    it("Update offer: non-seller should not be able to update the offer", async function () {
      const { realTokenYamUpgradeable, user2 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Revert when user 2 modifies the price of the offer, offerId = 0
      await expect(
        realTokenYamUpgradeable
          .connect(user2)
          .updateOffer(0, 20, BigNumber.from("1000000000000000000000"))
      ).to.revertedWith("only the seller can change offer");
    });
  });

  describe("4.3. Delete Offer", function () {
    it("Delete Offer: seller should be able to delete the offer", async function () {
      const { realTokenYamUpgradeable, user1 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Emit the "OfferDeleted" event when user 1 deletes the price of the offer, offerId = 0
      await expect(realTokenYamUpgradeable.connect(user1).deleteOffer(0))
        .to.emit(realTokenYamUpgradeable, "OfferDeleted")
        .withArgs(0);
    });

    it("DeleteOffer: non-seller should not be able to delete offer", async function () {
      const { realTokenYamUpgradeable, user2 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Revert when user 2 deletes the offer, offerId = 0
      await expect(
        realTokenYamUpgradeable.connect(user2).deleteOffer(0)
      ).to.revertedWith("only the seller can delete offer");
    });
    it("deleteOfferByAdmin: admin can call this function", async function () {
      const { realTokenYamUpgradeable, admin } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Admin deletes the offer, offerId = 0
      await expect(realTokenYamUpgradeable.connect(admin).deleteOfferByAdmin(0))
        .to.emit(realTokenYamUpgradeable, "OfferDeleted")
        .withArgs(0);
    });

    it("deleteOfferByAdmin: non-admin can not call this function", async function () {
      const { realTokenYamUpgradeable, user1 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Test function: deleteOfferByAdmin
      // Revert when user 1 deletes the offer using deleteOfferByAdmin, offerId = 0
      await expect(
        realTokenYamUpgradeable.connect(user1).deleteOfferByAdmin(0)
      ).to.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${await realTokenYamUpgradeable.DEFAULT_ADMIN_ROLE()}`
      );
    });
  });

  // describe("4.2. Buy function with checking transfer validity", function () {
  //   it("Function buy: should revert when price is wrong", async function () {
  //     const { realTokenYamUpgradeable, user2 } = await loadFixture(
  //       makeSuiteWhitelistAndCreateOffer
  //     );

  //     await expect(
  //       realTokenYamUpgradeable
  //         .connect(user2)
  //         .buy(1, 50000000, 1000000000000000) // price was stableRate
  //     ).to.revertedWith("offer price wrong");
  //   });

  //   it("Function buy: should work", async function () {
  //     const {
  //       usdcTokenTest,
  //       realTokenYamUpgradeable,
  //       bridgeToken,
  //       unlockTime,
  //       admin,
  //       user1,
  //       user2,
  //     } = await loadFixture(makeSuiteWhitelist);
  //     // User1 creates offer, user2 buys
  //     // User1 had 1000 BTT
  //     // User2 had 1000 USDC
  //     console.log(
  //       "User1 BridgeToken balance: ",
  //       await bridgeToken.balanceOf(user1.address)
  //     );
  //     console.log(
  //       "User2 USDCToken balance: ",
  //       await usdcTokenTest.balanceOf(user2.address)
  //     );

  //     await expect(
  //       realTokenYamUpgradeable
  //         .connect(user1)
  //         .createOffer(
  //           bridgeToken.address,
  //           usdcTokenTest.address,
  //           ZERO_ADDRESS,
  //           60000000,
  //           BigNumber.from("1000000000000000000000")
  //         )
  //     )
  //       .to.emit(realTokenYamUpgradeable, "OfferCreated")
  //       .withArgs(
  //         bridgeToken.address,
  //         usdcTokenTest.address,
  //         user1.address,
  //         ZERO_ADDRESS,
  //         0,
  //         60000000,
  //         BigNumber.from("1000000000000000000000")
  //       );

  //     console.log(
  //       "OfferCount: ",
  //       await realTokenYamUpgradeable.getOfferCount()
  //     );

  //     // User 1 creates an offer
  //     await bridgeToken
  //       .connect(user1)
  //       .approve(
  //         realTokenYamUpgradeable.address,
  //         BigNumber.from("1000000000000000000000")
  //       );
  //     await usdcTokenTest
  //       .connect(user2)
  //       .approve(
  //         realTokenYamUpgradeable.address,
  //         BigNumber.from("100000000000000000000000")
  //       );
  //     console.log(
  //       "Admin bridgetoken balance: ",
  //       await bridgeToken.balanceOf(admin.address)
  //     );
  //     console.log(
  //       "User1 usdctoken balance: ",
  //       await usdcTokenTest.balanceOf(user1.address)
  //     );

  //     console.log("User2 can buy when timelock is finished");
  //     console.log("Time now increased 1 year to: ", await time.latest());
  //     console.log("unlockTime: ", unlockTime);
  //     await expect(
  //       realTokenYamUpgradeable
  //         .connect(user2)
  //         .buy(
  //           BigNumber.from(0),
  //           BigNumber.from("60000000"),
  //           BigNumber.from("10000000000000000")
  //         )
  //     )
  //       .to.emit(realTokenYamUpgradeable, "OfferAccepted")
  //       .withArgs(
  //         0,
  //         user1.address,
  //         user2.address,
  //         bridgeToken.address,
  //         usdcTokenTest.address,
  //         BigNumber.from("60000000"),
  //         BigNumber.from("10000000000000000")
  //       );

  //     console.log(
  //       "User1 USDCToken balance: ",
  //       await usdcTokenTest.balanceOf(user2.address)
  //     );

  //     console.log(
  //       "User2 BridgeToken balance: ",
  //       await bridgeToken.balanceOf(user2.address)
  //     );
  //   });
  // });
});
