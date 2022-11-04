import { expect } from "chai";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { makeSuiteWhitelistAndCreateOffer } from "./helpers/make-suite";
import { ZERO_ADDRESS } from "../helpers/constants";
import {
  AMOUNT_OFFER_REALTOKEN,
  AMOUNT_OFFER_REALTOKEN_2,
  PRICE_REALTOKEN_1,
  PRICE_REALTOKEN_2,
} from "./helpers/constants";
import { getPermitSignatureRealToken } from "./helpers/utils/getPermitSignature";
import { any } from "hardhat/internal/core/params/argumentTypes";

describe("6. RealTokenYamUpgradeable user function using permit", function () {
  describe("6.1. CreateOfferWithPermit", function () {
    it("CreateOfferWithPermit: revert when isTransferValid is false, succeed when isTransferValid is true", async function () {
      const {
        bridgeToken,
        usdcRealT,
        realTokenYamUpgradeable,
        user1,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      const amountInWeiToPermit = BigNumber.from(
        await bridgeToken.allowance(
          user1.address,
          realTokenYamUpgradeable.address
        )
      ).add(AMOUNT_OFFER_REALTOKEN);

      const transactionDeadline = unlockTime + 3600;

      const { v, r, s }: any = await getPermitSignatureRealToken(
        user1,
        realTokenYamUpgradeable.address,
        amountInWeiToPermit,
        transactionDeadline,
        bridgeToken
      );

      const offerCount = await realTokenYamUpgradeable.getOfferCount();

      await expect(
        realTokenYamUpgradeable
          .connect(user1)
          .createOfferWithPermit(
            bridgeToken.address,
            usdcRealT.address,
            ZERO_ADDRESS,
            PRICE_REALTOKEN_1,
            AMOUNT_OFFER_REALTOKEN,
            transactionDeadline,
            v,
            r,
            s
          )
      ).to.be.revertedWith("Seller can not transfer tokens");

      await time.increaseTo(unlockTime);

      await expect(
        realTokenYamUpgradeable
          .connect(user1)
          .createOfferWithPermit(
            bridgeToken.address,
            usdcRealT.address,
            ZERO_ADDRESS,
            PRICE_REALTOKEN_1,
            AMOUNT_OFFER_REALTOKEN,
            transactionDeadline,
            v,
            r,
            s
          )
      )
        .to.emit(realTokenYamUpgradeable, "OfferCreated")
        .withArgs(
          bridgeToken.address,
          usdcRealT.address,
          user1.address,
          ZERO_ADDRESS,
          offerCount,
          PRICE_REALTOKEN_1,
          AMOUNT_OFFER_REALTOKEN
        );
    });
  });

  describe("6.2. UpdateOfferWithPermit", function () {
    it("UpdateOfferWithPermit: succeed when isTransferValid is true", async function () {
      const {
        bridgeToken,
        usdcRealT,
        realTokenYamUpgradeable,
        user1,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await time.increaseTo(unlockTime);
      const amountInWeiToPermit = BigNumber.from(
        await bridgeToken.allowance(
          user1.address,
          realTokenYamUpgradeable.address
        )
      ).add(AMOUNT_OFFER_REALTOKEN);

      const transactionDeadline = unlockTime + 3600;

      const { v, r, s }: any = await getPermitSignatureRealToken(
        user1,
        realTokenYamUpgradeable.address,
        amountInWeiToPermit,
        transactionDeadline,
        bridgeToken
      );

      const offerCount = await realTokenYamUpgradeable.getOfferCount();

      await expect(
        realTokenYamUpgradeable
          .connect(user1)
          .createOfferWithPermit(
            bridgeToken.address,
            usdcRealT.address,
            ZERO_ADDRESS,
            PRICE_REALTOKEN_1,
            AMOUNT_OFFER_REALTOKEN,
            transactionDeadline,
            v,
            r,
            s
          )
      )
        .to.emit(realTokenYamUpgradeable, "OfferCreated")
        .withArgs(
          bridgeToken.address,
          usdcRealT.address,
          user1.address,
          ZERO_ADDRESS,
          offerCount,
          PRICE_REALTOKEN_1,
          AMOUNT_OFFER_REALTOKEN
        );

      const updatePermitAmount = BigNumber.from(
        await bridgeToken.allowance(
          user1.address,
          realTokenYamUpgradeable.address
        )
      )
        .add(AMOUNT_OFFER_REALTOKEN_2)
        .sub(AMOUNT_OFFER_REALTOKEN);

      const updateSig = await getPermitSignatureRealToken(
        user1,
        realTokenYamUpgradeable.address,
        updatePermitAmount,
        transactionDeadline,
        bridgeToken
      );

      await expect(
        realTokenYamUpgradeable
          .connect(user1)
          .updateOfferWithPermit(
            offerCount,
            PRICE_REALTOKEN_2,
            AMOUNT_OFFER_REALTOKEN_2,
            transactionDeadline,
            updateSig.v,
            updateSig.r,
            updateSig.s
          )
      )
        .to.emit(realTokenYamUpgradeable, "OfferUpdated")
        .withArgs(
          offerCount,
          PRICE_REALTOKEN_1,
          PRICE_REALTOKEN_2,
          AMOUNT_OFFER_REALTOKEN,
          AMOUNT_OFFER_REALTOKEN_2
        );
    });
  });

  describe("6.2. UpdateOfferWithPermit", function () {
    it("UpdateOfferWithPermit: succeed when isTransferValid is true", async function () {
      const {
        bridgeToken,
        usdcRealT,
        realTokenYamUpgradeable,
        user1,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await time.increaseTo(unlockTime);
      const amountInWeiToPermit = BigNumber.from(
        await bridgeToken.allowance(
          user1.address,
          realTokenYamUpgradeable.address
        )
      ).add(AMOUNT_OFFER_REALTOKEN);

      const transactionDeadline = unlockTime + 3600;

      const { v, r, s }: any = await getPermitSignatureRealToken(
        user1,
        realTokenYamUpgradeable.address,
        amountInWeiToPermit,
        transactionDeadline,
        bridgeToken
      );

      const offerCount = await realTokenYamUpgradeable.getOfferCount();

      await expect(
        realTokenYamUpgradeable
          .connect(user1)
          .createOfferWithPermit(
            bridgeToken.address,
            usdcRealT.address,
            ZERO_ADDRESS,
            PRICE_REALTOKEN_1,
            AMOUNT_OFFER_REALTOKEN,
            transactionDeadline,
            v,
            r,
            s
          )
      )
        .to.emit(realTokenYamUpgradeable, "OfferCreated")
        .withArgs(
          bridgeToken.address,
          usdcRealT.address,
          user1.address,
          ZERO_ADDRESS,
          offerCount,
          PRICE_REALTOKEN_1,
          AMOUNT_OFFER_REALTOKEN
        );

      const updatePermitAmount = BigNumber.from(
        await bridgeToken.allowance(
          user1.address,
          realTokenYamUpgradeable.address
        )
      )
        .add(AMOUNT_OFFER_REALTOKEN_2)
        .sub(AMOUNT_OFFER_REALTOKEN);

      const updateSig = await getPermitSignatureRealToken(
        user1,
        realTokenYamUpgradeable.address,
        updatePermitAmount,
        transactionDeadline,
        bridgeToken
      );

      await expect(
        realTokenYamUpgradeable
          .connect(user1)
          .updateOfferWithPermit(
            offerCount,
            PRICE_REALTOKEN_2,
            AMOUNT_OFFER_REALTOKEN_2,
            transactionDeadline,
            updateSig.v,
            updateSig.r,
            updateSig.s
          )
      )
        .to.emit(realTokenYamUpgradeable, "OfferUpdated")
        .withArgs(
          offerCount,
          PRICE_REALTOKEN_1,
          PRICE_REALTOKEN_2,
          AMOUNT_OFFER_REALTOKEN,
          AMOUNT_OFFER_REALTOKEN_2
        );
    });
  });

  // describe("3.1. Create/Update/Delete Offer", function () {
  //   it("Create Offer: should revert when the tokens are not whitelisted", async function () {
  //     const { bridgeToken, usdcTokenTest, realTokenYamUpgradeable } =
  //       await loadFixture(makeSuite);

  //     await expect(
  //       realTokenYamUpgradeable.createOffer(
  //         bridgeToken.address,
  //         usdcTokenTest.address,
  //         ZERO_ADDRESS,
  //         10,
  //         BigNumber.from("1000000000000000000000")
  //       )
  //     ).to.be.revertedWith("Token is not whitelisted");
  //   });

  //   it("Update offer: seller should be able to update the offer", async function () {
  //     const {
  //       usdcTokenTest,
  //       bridgeToken,
  //       realTokenYamUpgradeable,
  //       user1,
  //       unlockTime,
  //     } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

  //     // // Increase time to unlockTime
  //     // await time.increaseTo(unlockTime);

  //     // await expect(
  //     //   realTokenYamUpgradeable
  //     //     .connect(user1)
  //     //     .updateOffer(1, 100, BigNumber.from("2000000000000000000000"))
  //     // )
  //     //   .to.emit(realTokenYamUpgradeable, "OfferUpdated")
  //     //   .withArgs(
  //     //     1,
  //     //     55000000, // old price
  //     //     100, // new price
  //     //     BigNumber.from("1000000000000000000000"), // old amount
  //     //     BigNumber.from("2000000000000000000000") // new amount
  //     //   );

  //     // expect(
  //     //   (await realTokenYamUpgradeable.getInitialOffer(1)).slice(0, 6)
  //     // ).to.eql([
  //     //   bridgeToken.address,
  //     //   usdcTokenTest.address,
  //     //   user1.address,
  //     //   ZERO_ADDRESS,
  //     //   BigNumber.from(100),
  //     //   BigNumber.from("2000000000000000000000"),
  //     // ]);
  //   });

  //   it("Update offer: non-seller should not be able to update the offer", async function () {
  //     const { realTokenYamUpgradeable, user2 } = await loadFixture(
  //       makeSuiteWhitelistAndCreateOffer
  //     );

  //     // Revert when user 2 modifies the price of the second offer, offerId = 1
  //     await expect(
  //       realTokenYamUpgradeable
  //         .connect(user2)
  //         .updateOffer(1, 20, BigNumber.from("1000000000000000000000"))
  //     ).to.revertedWith("only the seller can change offer");
  //   });

  //   it("Delete Offer: seller should be able to delete the offer", async function () {
  //     const { realTokenYamUpgradeable, user1 } = await loadFixture(
  //       makeSuiteWhitelistAndCreateOffer
  //     );

  //     // Emit the "OfferDeleted" event when user 1 deletes the price of the second offer, offerId = 2
  //     await expect(realTokenYamUpgradeable.connect(user1).deleteOffer(1))
  //       .to.emit(realTokenYamUpgradeable, "OfferDeleted")
  //       .withArgs(1);
  //   });

  //   it("DeleteOffer: non-seller should not be able to delete offer", async function () {
  //     const { realTokenYamUpgradeable, user2 } = await loadFixture(
  //       makeSuiteWhitelistAndCreateOffer
  //     );

  //     // Revert when user 2 deletes the offer, offerId = 1
  //     await expect(
  //       realTokenYamUpgradeable.connect(user2).deleteOffer(1)
  //     ).to.revertedWith("only the seller can delete offer");
  //   });
  //   it("deleteOfferByAdmin: admin can call this function", async function () {
  //     const { realTokenYamUpgradeable, admin } = await loadFixture(
  //       makeSuiteWhitelistAndCreateOffer
  //     );

  //     // Admin deletes the offer, offerId = 1
  //     await expect(realTokenYamUpgradeable.connect(admin).deleteOfferByAdmin(1))
  //       .to.emit(realTokenYamUpgradeable, "OfferDeleted")
  //       .withArgs(1);
  //   });

  //   it("deleteOfferByAdmin: non-admin can not call this function", async function () {
  //     const { realTokenYamUpgradeable, user1 } = await loadFixture(
  //       makeSuiteWhitelistAndCreateOffer
  //     );

  //     // Test function: deleteOfferByAdmin
  //     // Revert when user 1 deletes the offer using deleteOfferByAdmin, offerId = 1
  //     await expect(
  //       realTokenYamUpgradeable.connect(user1).deleteOfferByAdmin(1)
  //     ).to.revertedWith(
  //       `AccessControl: account ${user1.address.toLowerCase()} is missing role ${await realTokenYamUpgradeable.DEFAULT_ADMIN_ROLE()}`
  //     );
  //   });
  // });

  // describe("3.2. Buy function with checking transfer validity", function () {
  //   it("Function buy: should revert when price is wrong", async function () {
  //     const { realTokenYamUpgradeable, user2 } = await loadFixture(
  //       makeSuiteWhitelistAndCreateOffer
  //     );

  //     await expect(
  //       realTokenYamUpgradeable
  //         .connect(user2)
  //         .buy(1, 50000000, 1000000000000000) // price was 55000000
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
  //     // Increase time to unlockTime
  //     await time.increaseTo(unlockTime);

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
