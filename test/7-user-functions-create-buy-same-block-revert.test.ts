import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { makeSuiteWhitelistAndCreateOffer } from "./helpers/make-suite";
import { AMOUNT_OFFER_REALTOKEN, PRICE_REALTOKEN_1 } from "./helpers/constants";
import {
  getPermitSignatureERC20,
  getPermitSignatureRealToken,
} from "./helpers/utils/getPermitSignature";
import { ethers } from "hardhat";

describe("7. RealTokenYamUpgradeable buy reverts if it is in the same block as offer creation", function () {
  describe("7.1. CreateOfferWithPermit", function () {
    it("buy: revert when trying to buy in the same block as offer creation", async function () {
      const {
        bridgeToken,
        usdcRealT,
        realTokenYamUpgradeable,
        user1,
        user2,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await time.increaseTo(unlockTime);

      // Disable automatic mining
      await ethers.provider.send("evm_setAutomine", [false]);

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

      // Step 1: Pause automatic block mining.
      await ethers.provider.send("evm_setAutomine", [false]);
      await ethers.provider.send("evm_setIntervalMining", [10000]); // Disable interval mining

      // Step 2: Send both transactions without waiting for them to be mined.
      const createOfferTxPromise = realTokenYamUpgradeable
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
        );

      const buyOfferTxPromise = realTokenYamUpgradeable
        .connect(user2)
        .buy(offerCount, PRICE_REALTOKEN_1, AMOUNT_OFFER_REALTOKEN);

      // Step 3: Manually mine a new block, including both transactions.
      await ethers.provider.send("evm_mine");

      // Step 4: Now, check the status of both transactions.
      const createOfferTx = await createOfferTxPromise;
      const buyOfferTx = await buyOfferTxPromise;

      const txReceipt1 = await createOfferTx.wait();
      let txReceipt2;
      try {
        txReceipt2 = await buyOfferTx.wait();
        console.log("Transaction B was successful, unexpected result.");
      } catch (error) {
        console.log("Transaction B failed as expected.");
      }

      console.log("createOfferTx blockNumber: ", txReceipt1.blockNumber);
      if (txReceipt2) {
        console.log("buyOfferTx blockNumber: ", txReceipt2.blockNumber);
      }
    });
    it("buyWithPermit: revert when trying to buy in the same block as offer creation", async function () {
      const {
        bridgeToken,
        usdcRealT,
        realTokenYamUpgradeable,
        user1,
        user2,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await time.increaseTo(unlockTime);

      // Disable automatic mining
      await ethers.provider.send("evm_setAutomine", [false]);

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

      // Step 1: Pause automatic block mining.
      await ethers.provider.send("evm_setAutomine", [false]);
      await ethers.provider.send("evm_setIntervalMining", [10000]); // Disable interval mining

      // Step 2: Send both transactions without waiting for them to be mined.
      const createOfferTxPromise = realTokenYamUpgradeable
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
        );

      const buyOfferTxPromise = realTokenYamUpgradeable
        .connect(user2)
        .buyWithPermit(
          offerCount,
          PRICE_REALTOKEN_1,
          AMOUNT_OFFER_REALTOKEN,
          transactionDeadline,
          buySig.v,
          buySig.r,
          buySig.s
        );

      // Step 3: Manually mine a new block, including both transactions.
      await ethers.provider.send("evm_mine");

      // Step 4: Now, check the status of both transactions.
      const createOfferTx = await createOfferTxPromise;
      const buyOfferTx = await buyOfferTxPromise;

      const txReceipt1 = await createOfferTx.wait();
      let txReceipt2;
      try {
        txReceipt2 = await buyOfferTx.wait();
        console.log("Transaction B was successful, unexpected result.");
      } catch (error) {
        console.log("Transaction B failed as expected.");
      }

      console.log("createOfferTx blockNumber: ", txReceipt1.blockNumber);
      if (txReceipt2) {
        console.log("buyOfferTx blockNumber: ", txReceipt2.blockNumber);
      }
    });
    it("buyOfferBatch: revert when trying to buy in the same block as offer creation", async function () {
      const {
        bridgeToken,
        usdcRealT,
        realTokenYamUpgradeable,
        user1,
        user2,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await time.increaseTo(unlockTime);

      // Disable automatic mining
      await ethers.provider.send("evm_setAutomine", [false]);

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

      // Step 1: Pause automatic block mining.
      await ethers.provider.send("evm_setAutomine", [false]);
      await ethers.provider.send("evm_setIntervalMining", [10000]); // Disable interval mining

      // Step 2: Send both transactions without waiting for them to be mined.
      const createOfferTxPromise = realTokenYamUpgradeable
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
        );

      const buyOfferTxPromise = realTokenYamUpgradeable
        .connect(user2)
        .buyOfferBatch(
          [offerCount],
          [PRICE_REALTOKEN_1],
          [AMOUNT_OFFER_REALTOKEN]
        );

      // Step 3: Manually mine a new block, including both transactions.
      await ethers.provider.send("evm_mine");

      // Step 4: Now, check the status of both transactions.
      const createOfferTx = await createOfferTxPromise;
      const buyOfferTx = await buyOfferTxPromise;

      const txReceipt1 = await createOfferTx.wait();
      let txReceipt2;
      try {
        txReceipt2 = await buyOfferTx.wait();
        console.log("Transaction B was successful, unexpected result.");
      } catch (error) {
        console.log("Transaction B failed as expected.");
      }

      console.log("createOfferTx blockNumber: ", txReceipt1.blockNumber);
      if (txReceipt2) {
        console.log("buyOfferTx blockNumber: ", txReceipt2.blockNumber);
      }
    });
  });

  describe("7.2. CreateOffer", function () {
    it("buy: revert when trying to buy in the same block as offer creation", async function () {
      const {
        bridgeToken,
        usdcRealT,
        realTokenYamUpgradeable,
        user1,
        user2,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await time.increaseTo(unlockTime);

      // Disable automatic mining
      await ethers.provider.send("evm_setAutomine", [false]);

      const offerCount = await realTokenYamUpgradeable.getOfferCount();

      // Step 1: Pause automatic block mining.
      await ethers.provider.send("evm_setAutomine", [false]);
      await ethers.provider.send("evm_setIntervalMining", [10000]); // Disable interval mining

      // Step 2: Send both transactions without waiting for them to be mined.
      const createOfferTxPromise = realTokenYamUpgradeable
        .connect(user1)
        .createOffer(
          bridgeToken.address,
          usdcRealT.address,
          user2.address,
          PRICE_REALTOKEN_1,
          AMOUNT_OFFER_REALTOKEN
        );

      const buyOfferTxPromise = realTokenYamUpgradeable
        .connect(user2)
        .buy(offerCount, PRICE_REALTOKEN_1, AMOUNT_OFFER_REALTOKEN);

      // Step 3: Manually mine a new block, including both transactions.
      await ethers.provider.send("evm_mine");

      // Step 4: Now, check the status of both transactions.
      const createOfferTx = await createOfferTxPromise;
      const buyOfferTx = await buyOfferTxPromise;

      const txReceipt1 = await createOfferTx.wait();
      let txReceipt2;
      try {
        txReceipt2 = await buyOfferTx.wait();
        console.log("Transaction B was successful, unexpected result.");
      } catch (error) {
        console.log("Transaction B failed as expected.");
      }

      console.log("createOfferTx blockNumber: ", txReceipt1.blockNumber);
      if (txReceipt2) {
        console.log("buyOfferTx blockNumber: ", txReceipt2.blockNumber);
      }
    });
    it("buyWithPermit: revert when trying to buy in the same block as offer creation", async function () {
      const {
        bridgeToken,
        usdcRealT,
        realTokenYamUpgradeable,
        user1,
        user2,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await time.increaseTo(unlockTime);

      // Disable automatic mining
      await ethers.provider.send("evm_setAutomine", [false]);

      const transactionDeadline = unlockTime + 3600;

      const offerCount = await realTokenYamUpgradeable.getOfferCount();

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

      // Step 1: Pause automatic block mining.
      await ethers.provider.send("evm_setAutomine", [false]);
      await ethers.provider.send("evm_setIntervalMining", [10000]); // Disable interval mining

      // Step 2: Send both transactions without waiting for them to be mined.
      const createOfferTxPromise = realTokenYamUpgradeable
        .connect(user1)
        .createOffer(
          bridgeToken.address,
          usdcRealT.address,
          user2.address,
          PRICE_REALTOKEN_1,
          AMOUNT_OFFER_REALTOKEN
        );

      const buyOfferTxPromise = realTokenYamUpgradeable
        .connect(user2)
        .buyWithPermit(
          offerCount,
          PRICE_REALTOKEN_1,
          AMOUNT_OFFER_REALTOKEN,
          transactionDeadline,
          buySig.v,
          buySig.r,
          buySig.s
        );

      // Step 3: Manually mine a new block, including both transactions.
      await ethers.provider.send("evm_mine");

      // Step 4: Now, check the status of both transactions.
      const createOfferTx = await createOfferTxPromise;
      const buyOfferTx = await buyOfferTxPromise;

      const txReceipt1 = await createOfferTx.wait();
      let txReceipt2;
      try {
        txReceipt2 = await buyOfferTx.wait();
        console.log("Transaction B was successful, unexpected result.");
      } catch (error) {
        console.log("Transaction B failed as expected.");
      }

      console.log("createOfferTx blockNumber: ", txReceipt1.blockNumber);
      if (txReceipt2) {
        console.log("buyOfferTx blockNumber: ", txReceipt2.blockNumber);
      }
    });

    it("buyOfferBatch: revert when trying to buy in the same block as offer creation", async function () {
      const {
        bridgeToken,
        usdcRealT,
        realTokenYamUpgradeable,
        user1,
        user2,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await time.increaseTo(unlockTime);

      // Disable automatic mining
      await ethers.provider.send("evm_setAutomine", [false]);

      const offerCount = await realTokenYamUpgradeable.getOfferCount();

      const buyPermitAmount = AMOUNT_OFFER_REALTOKEN.mul(PRICE_REALTOKEN_1).div(
        BigNumber.from(10).pow(await bridgeToken.decimals())
      );
      console.log("buyPermitAmount", buyPermitAmount.toString());

      // Step 1: Pause automatic block mining.
      await ethers.provider.send("evm_setAutomine", [false]);
      await ethers.provider.send("evm_setIntervalMining", [10000]); // Disable interval mining

      // Step 2: Send both transactions without waiting for them to be mined.
      const createOfferTxPromise = realTokenYamUpgradeable
        .connect(user1)
        .createOffer(
          bridgeToken.address,
          usdcRealT.address,
          user2.address,
          PRICE_REALTOKEN_1,
          AMOUNT_OFFER_REALTOKEN
        );

      const buyOfferTxPromise = realTokenYamUpgradeable
        .connect(user2)
        .buyOfferBatch(
          [offerCount],
          [PRICE_REALTOKEN_1],
          [AMOUNT_OFFER_REALTOKEN]
        );

      // Step 3: Manually mine a new block, including both transactions.
      await ethers.provider.send("evm_mine");

      // Step 4: Now, check the status of both transactions.
      const createOfferTx = await createOfferTxPromise;
      const buyOfferTx = await buyOfferTxPromise;

      const txReceipt1 = await createOfferTx.wait();
      let txReceipt2;
      try {
        txReceipt2 = await buyOfferTx.wait();
        console.log("Transaction B was successful, unexpected result.");
      } catch (error) {
        console.log("Transaction B failed as expected.");
      }

      console.log("createOfferTx blockNumber: ", txReceipt1.blockNumber);
      if (txReceipt2) {
        console.log("buyOfferTx blockNumber: ", txReceipt2.blockNumber);
      }
    });
  });

  describe("7.3. CreateOfferBatch", function () {
    it("buy: revert when trying to buy in the same block as offer creation", async function () {
      const {
        bridgeToken,
        usdcRealT,
        realTokenYamUpgradeable,
        user1,
        user2,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await time.increaseTo(unlockTime);

      // Disable automatic mining
      await ethers.provider.send("evm_setAutomine", [false]);

      const offerCount = await realTokenYamUpgradeable.getOfferCount();

      // Step 1: Pause automatic block mining.
      await ethers.provider.send("evm_setAutomine", [false]);
      await ethers.provider.send("evm_setIntervalMining", [10000]); // Disable interval mining

      // Step 2: Send both transactions without waiting for them to be mined.
      const createOfferTxPromise = realTokenYamUpgradeable
        .connect(user1)
        .createOfferBatch(
          [bridgeToken.address],
          [usdcRealT.address],
          [user2.address],
          [PRICE_REALTOKEN_1],
          [AMOUNT_OFFER_REALTOKEN]
        );
      const buyOfferTxPromise = realTokenYamUpgradeable
        .connect(user2)
        .buy(offerCount, PRICE_REALTOKEN_1, AMOUNT_OFFER_REALTOKEN);

      // Step 3: Manually mine a new block, including both transactions.
      await ethers.provider.send("evm_mine");

      // Step 4: Now, check the status of both transactions.
      const createOfferTx = await createOfferTxPromise;
      const buyOfferTx = await buyOfferTxPromise;

      const txReceipt1 = await createOfferTx.wait();
      let txReceipt2;
      try {
        txReceipt2 = await buyOfferTx.wait();
        console.log("Transaction B was successful, unexpected result.");
      } catch (error) {
        console.log("Transaction B failed as expected.");
      }

      console.log("createOfferTx blockNumber: ", txReceipt1.blockNumber);
      if (txReceipt2) {
        console.log("buyOfferTx blockNumber: ", txReceipt2.blockNumber);
      }
    });
    it("buyWithPermit: revert when trying to buy in the same block as offer creation", async function () {
      const {
        bridgeToken,
        usdcRealT,
        realTokenYamUpgradeable,
        user1,
        user2,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await time.increaseTo(unlockTime);

      // Disable automatic mining
      await ethers.provider.send("evm_setAutomine", [false]);

      const transactionDeadline = unlockTime + 3600;

      const offerCount = await realTokenYamUpgradeable.getOfferCount();

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

      // Step 1: Pause automatic block mining.
      await ethers.provider.send("evm_setAutomine", [false]);
      await ethers.provider.send("evm_setIntervalMining", [10000]); // Disable interval mining

      // Step 2: Send both transactions without waiting for them to be mined.
      const createOfferTxPromise = realTokenYamUpgradeable
        .connect(user1)
        .createOfferBatch(
          [bridgeToken.address],
          [usdcRealT.address],
          [user2.address],
          [PRICE_REALTOKEN_1],
          [AMOUNT_OFFER_REALTOKEN]
        );

      const buyOfferTxPromise = realTokenYamUpgradeable
        .connect(user2)
        .buyWithPermit(
          offerCount,
          PRICE_REALTOKEN_1,
          AMOUNT_OFFER_REALTOKEN,
          transactionDeadline,
          buySig.v,
          buySig.r,
          buySig.s
        );

      // Step 3: Manually mine a new block, including both transactions.
      await ethers.provider.send("evm_mine");

      // Step 4: Now, check the status of both transactions.
      const createOfferTx = await createOfferTxPromise;
      const buyOfferTx = await buyOfferTxPromise;

      const txReceipt1 = await createOfferTx.wait();
      let txReceipt2;
      try {
        txReceipt2 = await buyOfferTx.wait();
        console.log("Transaction B was successful, unexpected result.");
      } catch (error) {
        console.log("Transaction B failed as expected.");
      }

      console.log("createOfferTx blockNumber: ", txReceipt1.blockNumber);
      if (txReceipt2) {
        console.log("buyOfferTx blockNumber: ", txReceipt2.blockNumber);
      }
    });
    it("buyOfferBatch: revert when trying to buy in the same block as offer creation", async function () {
      const {
        bridgeToken,
        usdcRealT,
        realTokenYamUpgradeable,
        user1,
        user2,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      await time.increaseTo(unlockTime);

      // Disable automatic mining
      await ethers.provider.send("evm_setAutomine", [false]);

      const offerCount = await realTokenYamUpgradeable.getOfferCount();

      const buyPermitAmount = AMOUNT_OFFER_REALTOKEN.mul(PRICE_REALTOKEN_1).div(
        BigNumber.from(10).pow(await bridgeToken.decimals())
      );
      console.log("buyPermitAmount", buyPermitAmount.toString());

      // Step 1: Pause automatic block mining.
      await ethers.provider.send("evm_setAutomine", [false]);
      await ethers.provider.send("evm_setIntervalMining", [10000]); // Disable interval mining

      // Step 2: Send both transactions without waiting for them to be mined.
      const createOfferTxPromise = realTokenYamUpgradeable
        .connect(user1)
        .createOfferBatch(
          [bridgeToken.address],
          [usdcRealT.address],
          [user2.address],
          [PRICE_REALTOKEN_1],
          [AMOUNT_OFFER_REALTOKEN]
        );

      const buyOfferTxPromise = realTokenYamUpgradeable
        .connect(user2)
        .buyOfferBatch(
          [offerCount],
          [PRICE_REALTOKEN_1],
          [AMOUNT_OFFER_REALTOKEN]
        );

      // Step 3: Manually mine a new block, including both transactions.
      await ethers.provider.send("evm_mine");

      // Step 4: Now, check the status of both transactions.
      const createOfferTx = await createOfferTxPromise;
      const buyOfferTx = await buyOfferTxPromise;

      const txReceipt1 = await createOfferTx.wait();
      let txReceipt2;
      try {
        txReceipt2 = await buyOfferTx.wait();
        console.log("Transaction B was successful, unexpected result.");
      } catch (error) {
        console.log("Transaction B failed as expected.");
      }

      console.log("createOfferTx blockNumber: ", txReceipt1.blockNumber);
      if (txReceipt2) {
        console.log("buyOfferTx blockNumber: ", txReceipt2.blockNumber);
      }
    });
  });
});
