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
import {
  getPermitSignatureERC20,
  getPermitSignatureRealToken,
} from "./helpers/utils/getPermitSignature";

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

      const amountInWeiToPermit = AMOUNT_OFFER_REALTOKEN;
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

      const amountInWeiToPermit = AMOUNT_OFFER_REALTOKEN;

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

  describe("6.3. BuyWithPermit", function () {
    it("BuyWithPermit: succeed when isTransferValid is true", async function () {
      const {
        bridgeToken,
        usdcRealT,
        realTokenYamUpgradeable,
        user1,
        user2,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await time.increaseTo(unlockTime);

      const amountInWeiToPermit = AMOUNT_OFFER_REALTOKEN;

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
            user2.address,
            PRICE_REALTOKEN_1,
            AMOUNT_OFFER_REALTOKEN,
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
          user2.address,
          offerCount,
          PRICE_REALTOKEN_1,
          AMOUNT_OFFER_REALTOKEN
        );

      const buyPermitAmount = AMOUNT_OFFER_REALTOKEN.mul(PRICE_REALTOKEN_1).div(
        BigNumber.from(10).pow(await bridgeToken.decimals())
      );
      console.log("buyPermitAmount", buyPermitAmount.toString());

      const buySig = await getPermitSignatureERC20(
        user2,
        realTokenYamUpgradeable.address,
        buyPermitAmount,
        transactionDeadline,
        usdcRealT
      );

      await expect(
        realTokenYamUpgradeable
          .connect(user2)
          .buyWithPermit(
            offerCount,
            PRICE_REALTOKEN_1,
            AMOUNT_OFFER_REALTOKEN,
            transactionDeadline,
            buySig.v,
            buySig.r,
            buySig.s
          )
      )
        .to.emit(realTokenYamUpgradeable, "OfferAccepted")
        .withArgs(
          offerCount,
          user1.address,
          user2.address,
          bridgeToken.address,
          usdcRealT.address,
          PRICE_REALTOKEN_1,
          AMOUNT_OFFER_REALTOKEN
        );
    });
  });

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
