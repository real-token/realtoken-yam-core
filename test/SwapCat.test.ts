import { expect } from "chai";
import { BigNumber } from "ethers";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { BridgeToken } from "../typechain/BridgeToken";
import { Processor } from "../typechain/Processor";
import { RuleEngine } from "../typechain/RuleEngine";
import { ComplianceRegistry } from "../typechain/ComplianceRegistry";
import { UserFreezeRule } from "../typechain/UserFreezeRule";
import { VestingRule } from "../typechain/VestingRule";
import { UserAttributeValidToRule } from "../typechain/UserAttributeValidToRule";
import { SwapCatUpgradeable } from "../typechain/SwapCatUpgradeable";
import { SwapCatUpgradeableV2 } from "../typechain/SwapCatUpgradeableV2";

describe("SwapCatUpgradeable", function () {
  async function makeSuite() {
    const [admin, moderator, user1, user2]: SignerWithAddress[] =
      await ethers.getSigners();
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const USDCTokenTest = await ethers.getContractFactory("USDCTokenTest");
    const RuleEngineFactory = await ethers.getContractFactory("RuleEngine");
    const ProcessorFactory = await ethers.getContractFactory("Processor");
    const BridgeTokenFactory = await ethers.getContractFactory("BridgeToken");
    const UserAttributeValidToRuleFactory = await ethers.getContractFactory(
      "UserAttributeValidToRule"
    );
    const UserFreezeRuleFactory = await ethers.getContractFactory(
      "UserFreezeRule"
    );
    const VestingRuleFactory = await ethers.getContractFactory("VestingRule");
    const ComplianceRegistryFactory = await ethers.getContractFactory(
      "ComplianceRegistry"
    );
    const SwapCatUpgradeableFactory = await ethers.getContractFactory(
      "SwapCatUpgradeable"
    );

    const usdcTokenTest = await USDCTokenTest.deploy();

    // Deploy ComplianceRegistry contract: owner = admin
    const complianceRegistry = (await upgrades.deployProxy(
      ComplianceRegistryFactory,
      [admin.address]
    )) as ComplianceRegistry;

    // Deploy UserAttributeValidToRule contract
    const userAttributeValidToRule = (await upgrades.deployProxy(
      UserAttributeValidToRuleFactory,
      [complianceRegistry.address]
    )) as UserAttributeValidToRule;

    // Deploy UserFreezeRule contract
    const userFreezeRule = (await upgrades.deployProxy(UserFreezeRuleFactory, [
      complianceRegistry.address,
    ])) as UserFreezeRule;

    // Deploy VestingRule contract
    const vestingRule = (await upgrades.deployProxy(VestingRuleFactory, [
      complianceRegistry.address,
    ])) as VestingRule;

    // Deploy RuleEngine contract: owner = admin
    const ruleEngine = (await upgrades.deployProxy(RuleEngineFactory, [
      admin.address,
    ])) as RuleEngine;

    // Set rules in ruleEngine
    await ruleEngine.setRules([
      ZERO_ADDRESS,
      userFreezeRule.address, // Rule 1
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      userAttributeValidToRule.address, // Rule 11
      vestingRule.address, // Rule 12
    ]);

    // Deploy Processor contract: owner = admin
    const processor = (await upgrades.deployProxy(
      ProcessorFactory,
      [admin.address, ruleEngine.address], // owner address, ruleEngine address
      { initializer: "initialize(address owner, address _ruleEngine)" }
    )) as Processor;

    // Deploy BridgeToken contract: owner = admin
    const bridgeToken = (await upgrades.deployProxy(
      BridgeTokenFactory,
      [
        admin.address, // owner address
        processor.address, // processor address
        "Bridge Token Test", // name
        "BTT", // symbol
        18, // decimals
        [admin.address], // trustedIntermediaries
      ],
      {
        initializer:
          "initialize(address owner, address processor, string name, string symbol, uint8 decimals, address[] trustedIntermediaries)",
      }
    )) as BridgeToken;

    // Set rules in bridgeToken
    // Rule 11: tokenId
    // Rule 1: isFrozen
    // Rule 12: VestingTimestamp
    // Source: https://github.com/MtPelerin/bridge-v2/blob/master/docs/RuleEngine.md
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;
    console.log("Unlock timestamp: ", unlockTime);

    await bridgeToken
      .connect(admin)
      .setRules(["11", "1", "12"], ["100001", "0", unlockTime]);
    console.log("BridgeToken Rules: ", await bridgeToken.rules());

    // Set roles: administrator, supplier
    await bridgeToken.addAdministrator(admin.address);
    await bridgeToken.addSupplier(admin.address);
    // Mint 1000000 BTT to admin address
    await bridgeToken.mint(
      admin.address,
      BigNumber.from("1000000000000000000000000")
    );
    console.log(
      "BTT Admin balance ",
      await bridgeToken.balanceOf(admin.address)
    );

    // Whitelist admin, user1, user2
    await complianceRegistry.registerUser(
      admin.address,
      [BigNumber.from("100001")],
      [1]
    );
    await complianceRegistry.registerUser(
      user1.address,
      [BigNumber.from("100001")],
      [1]
    );
    await complianceRegistry.registerUser(
      user2.address,
      [BigNumber.from("100001")],
      [1]
    );

    // Deploy SwapCatUpgradeable contract
    const swapCatUpgradeable = (await upgrades.deployProxy(
      SwapCatUpgradeableFactory,
      [admin.address, moderator.address]
    )) as SwapCatUpgradeable;

    return {
      usdcTokenTest,
      bridgeToken,
      swapCatUpgradeable,
      complianceRegistry,
      ruleEngine,
      processor,
      unlockTime,
      admin,
      moderator,
      user1,
      user2,
    };
  }

  async function makeSuiteWhitelist() {
    const {
      usdcTokenTest,
      bridgeToken,
      swapCatUpgradeable,
      complianceRegistry,
      ruleEngine,
      unlockTime,
      admin,
      moderator,
      user1,
      user2,
    } = await loadFixture(makeSuite);
    const amount1 = BigNumber.from("1000000000000000000000"); // 1000 BTT
    const amount2 = BigNumber.from("1000000000"); // 1000 USDC
    await swapCatUpgradeable
      .connect(admin)
      .toggleWhitelist(usdcTokenTest.address);
    await swapCatUpgradeable
      .connect(admin)
      .toggleWhitelist(bridgeToken.address);

    await bridgeToken.transfer(user1.address, amount1); // Send 1000 RTT to user1
    await usdcTokenTest.transfer(user2.address, amount2); // Send 1000 USDC to user2

    return {
      usdcTokenTest,
      bridgeToken,
      swapCatUpgradeable,
      complianceRegistry,
      ruleEngine,
      unlockTime,
      admin,
      moderator,
      user1,
      user2,
    };
  }

  async function makeSuiteWhitelistAndCreateOffer() {
    const {
      usdcTokenTest,
      swapCatUpgradeable,
      complianceRegistry,
      ruleEngine,
      bridgeToken,
      unlockTime,
      admin,
      moderator,
      user1,
      user2,
    } = await loadFixture(makeSuiteWhitelist);
    // Create offer: offerId = 0
    await swapCatUpgradeable
      .connect(user1)
      .createOffer(
        bridgeToken.address,
        usdcTokenTest.address,
        0,
        50000000,
        BigNumber.from("1000000000000000000000")
      );

    // Create offer: offerId = 1
    await swapCatUpgradeable
      .connect(user1)
      .createOffer(
        bridgeToken.address,
        usdcTokenTest.address,
        0,
        55000000,
        BigNumber.from("1000000000000000000000")
      );

    await bridgeToken
      .connect(user1)
      .approve(
        swapCatUpgradeable.address,
        BigNumber.from("10000000000000000000")
      );
    await usdcTokenTest
      .connect(user2)
      .approve(swapCatUpgradeable.address, BigNumber.from("10000000"));

    return {
      bridgeToken,
      usdcTokenTest,
      swapCatUpgradeable,
      complianceRegistry,
      ruleEngine,
      unlockTime,
      admin,
      moderator,
      user1,
      user2,
    };
  }

  // Test 1: Deployment
  describe("1. Deployment", function () {
    it("Should initialize with the right admin", async function () {
      const { swapCatUpgradeable, admin } = await loadFixture(makeSuite);

      expect(
        await swapCatUpgradeable.hasRole(
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          admin.address
        )
      ).to.equal(true);
    });

    it("Should initialize with the right upgrader", async function () {
      const { swapCatUpgradeable, admin } = await loadFixture(makeSuite);

      expect(
        await swapCatUpgradeable.hasRole(
          keccak256(toUtf8Bytes("UPGRADER_ROLE")),
          admin.address
        )
      ).to.equal(true);
    });

    it("Should initialize with the right moderator", async function () {
      const { swapCatUpgradeable, moderator } = await loadFixture(makeSuite);

      expect(await swapCatUpgradeable.moderator()).to.equal(moderator.address);
    });
  });

  // Test 2: Whitelist
  describe("2. Whitelist/unWhitelist", function () {
    it("Whitelist/unWhitelist: should work with admin and emit the right event", async function () {
      const { bridgeToken, swapCatUpgradeable } = await loadFixture(makeSuite);
      await expect(swapCatUpgradeable.toggleWhitelist(bridgeToken.address))
        .to.emit(swapCatUpgradeable, "TokenWhitelisted")
        .withArgs(bridgeToken.address);

      expect(
        await swapCatUpgradeable.isWhitelisted(bridgeToken.address)
      ).to.equal(true);

      await expect(swapCatUpgradeable.toggleWhitelist(bridgeToken.address))
        .to.emit(swapCatUpgradeable, "TokenUnWhitelisted")
        .withArgs(bridgeToken.address);

      expect(
        await swapCatUpgradeable.isWhitelisted(bridgeToken.address)
      ).to.equal(false);
    });

    it("Whitelist/unWhitelist: should not work with other address", async function () {
      const { bridgeToken, swapCatUpgradeable, user1 } = await loadFixture(
        makeSuite
      );

      await expect(
        swapCatUpgradeable.connect(user1).toggleWhitelist(bridgeToken.address)
      ).to.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${await swapCatUpgradeable.DEFAULT_ADMIN_ROLE()}`
      );
    });
  });

  // Test 3: Create, modify, delete offer
  describe("3. Create/Modify/Delete Offer", function () {
    it("Create Offer: should create an offer when both tokens are whitelisted", async function () {
      const { bridgeToken, usdcTokenTest, swapCatUpgradeable } =
        await loadFixture(makeSuite);

      await expect(swapCatUpgradeable.toggleWhitelist(bridgeToken.address))
        .to.emit(swapCatUpgradeable, "TokenWhitelisted")
        .withArgs(bridgeToken.address);

      await expect(swapCatUpgradeable.toggleWhitelist(usdcTokenTest.address))
        .to.emit(swapCatUpgradeable, "TokenWhitelisted")
        .withArgs(usdcTokenTest.address);

      await expect(
        swapCatUpgradeable.createOffer(
          bridgeToken.address,
          usdcTokenTest.address,
          0,
          10,
          BigNumber.from("1000000000000000000000")
        )
      )
        .to.emit(swapCatUpgradeable, "OfferCreated")
        .withArgs(
          bridgeToken.address,
          usdcTokenTest.address,
          0,
          10,
          BigNumber.from("1000000000000000000000")
        );

      await expect(
        swapCatUpgradeable.createOffer(
          bridgeToken.address,
          usdcTokenTest.address,
          0,
          15,
          BigNumber.from("1000000000000000000000")
        )
      )
        .to.emit(swapCatUpgradeable, "OfferCreated")
        .withArgs(
          bridgeToken.address,
          usdcTokenTest.address,
          1,
          15,
          BigNumber.from("1000000000000000000000")
        );
    });

    it("Create Offer: should revert when the tokens are not whitelisted", async function () {
      const { bridgeToken, usdcTokenTest, swapCatUpgradeable } =
        await loadFixture(makeSuite);

      await expect(
        swapCatUpgradeable.createOffer(
          bridgeToken.address,
          usdcTokenTest.address,
          0,
          10,
          BigNumber.from("1000000000000000000000")
        )
      ).to.be.revertedWith("Token is not whitelisted");
    });

    it("Modify offer: seller should be able to modify the offer", async function () {
      const { bridgeToken, usdcTokenTest, swapCatUpgradeable, user1 } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);
      await expect(
        swapCatUpgradeable
          .connect(user1)
          .createOffer(
            bridgeToken.address,
            usdcTokenTest.address,
            1,
            100,
            BigNumber.from("1000000000000000000000")
          )
      )
        .to.emit(swapCatUpgradeable, "OfferCreated")
        .withArgs(
          bridgeToken.address,
          usdcTokenTest.address,
          1,
          100,
          BigNumber.from("1000000000000000000000")
        );
    });

    it("Modify offer: non-seller should not be able to modify the offer", async function () {
      const { bridgeToken, usdcTokenTest, swapCatUpgradeable, user2 } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);

      // Revert when user 2 modifies the price of the second offer, offerId = 1
      await expect(
        swapCatUpgradeable
          .connect(user2)
          .createOffer(
            bridgeToken.address,
            usdcTokenTest.address,
            1,
            20,
            BigNumber.from("1000000000000000000000")
          )
      ).to.revertedWith("only the seller can change offer");
    });

    it("Delete Offer: seller should be able to delete the offer", async function () {
      const { swapCatUpgradeable, user1 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Emit the "OfferDeleted" event when user 1 deletes the price of the second offer, offerId = 2
      await expect(swapCatUpgradeable.connect(user1).deleteOffer(1))
        .to.emit(swapCatUpgradeable, "OfferDeleted")
        .withArgs(1);
    });

    it("DeleteOffer: non-seller should not be able to delete offer", async function () {
      const { swapCatUpgradeable, user2 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Revert when user 2 deletes the offer, offerId = 1
      await expect(
        swapCatUpgradeable.connect(user2).deleteOffer(1)
      ).to.revertedWith("only the seller can delete offer");
    });
    it("deleteOfferByAdmin: admin can call this function", async function () {
      const { swapCatUpgradeable, admin } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Admin deletes the offer, offerId = 1
      await expect(swapCatUpgradeable.connect(admin).deleteOfferByAdmin(1))
        .to.emit(swapCatUpgradeable, "OfferDeleted")
        .withArgs(1);
    });

    it("deleteOfferByAdmin: non-admin can not call this function", async function () {
      const { swapCatUpgradeable, user1 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Test function: deleteOfferByAdmin
      // Revert when user 1 deletes the offer using deleteOfferByAdmin, offerId = 1
      await expect(
        swapCatUpgradeable.connect(user1).deleteOfferByAdmin(1)
      ).to.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${await swapCatUpgradeable.DEFAULT_ADMIN_ROLE()}`
      );
    });
  });

  describe("4. View functions: getOfferCount/tokenInfo/showOffer/pricePreview", function () {
    it("getOfferCount: should return the correct number of offers", async function () {
      const { swapCatUpgradeable } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );
      expect(await swapCatUpgradeable.getOfferCount()).to.equal(2);
    });
    it("Function tokenInfo: should work", async function () {
      const { bridgeToken, usdcTokenTest, swapCatUpgradeable } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);

      expect(
        await swapCatUpgradeable.tokenInfo(bridgeToken.address)
      ).to.deep.equal([
        BigNumber.from(await bridgeToken.decimals()),
        await bridgeToken.symbol(),
        await bridgeToken.name(),
      ]);

      expect(
        await swapCatUpgradeable.tokenInfo(usdcTokenTest.address)
      ).to.deep.equal([
        BigNumber.from(await usdcTokenTest.decimals()),
        await usdcTokenTest.symbol(),
        await usdcTokenTest.name(),
      ]);
    });

    it("Function showOffer: should work", async function () {
      const { bridgeToken, usdcTokenTest, swapCatUpgradeable, user1 } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);

      // Test function: showOffer (offerToken buyerToken, sellerAddress, price)
      expect((await swapCatUpgradeable.showOffer(0)).slice(0, 4)).to.eql([
        bridgeToken.address,
        usdcTokenTest.address,
        user1.address,
        BigNumber.from("50000000"),
      ]);

      // Test function: showOffer (availablebalance)
      // When allowance is inferior than user1 balance, the availablebalance is equal to the allowance
      expect((await swapCatUpgradeable.showOffer(0))[4]).to.equal(
        await bridgeToken.allowance(user1.address, swapCatUpgradeable.address)
      );
      // When allowance is inferior than user1 balance
      await expect(
        bridgeToken
          .connect(user1)
          .approve(
            swapCatUpgradeable.address,
            BigNumber.from(await bridgeToken.balanceOf(user1.address)).add(1)
          )
      )
        .to.emit(bridgeToken, "Approval")
        .withArgs(
          user1.address,
          swapCatUpgradeable.address,
          BigNumber.from(await bridgeToken.balanceOf(user1.address)).add(1)
        );

      expect((await swapCatUpgradeable.showOffer(0))[4]).to.equal(
        await bridgeToken.balanceOf(user1.address)
      );
    });

    it("Function pricePreview: should work", async function () {
      const { swapCatUpgradeable } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Test pricePreview function
      expect(
        await swapCatUpgradeable.pricePreview(
          0,
          BigNumber.from(1000000000000000)
        )
      ).to.equal(BigNumber.from(50001));
    });
  });

  describe("5. Buy function with checking transfer validity", function () {
    it("Function buy: should revert when price is wrong", async function () {
      const { swapCatUpgradeable, user2 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      await expect(
        swapCatUpgradeable.connect(user2).buy(1, 50000000, 1000000000000000) // price was 55000000
      ).to.revertedWith("offer price wrong");
    });

    it("Function buy: should work", async function () {
      const {
        usdcTokenTest,
        swapCatUpgradeable,
        bridgeToken,
        unlockTime,
        admin,
        user1,
        user2,
      } = await loadFixture(makeSuiteWhitelist);

      // User1 creates offer, user2 buys
      // User1 had 1000 BTT
      // User2 had 1000 USDC
      console.log(
        "User1 BridgeToken balance: ",
        await bridgeToken.balanceOf(user1.address)
      );
      console.log(
        "User2 USDCToken balance: ",
        await usdcTokenTest.balanceOf(user2.address)
      );

      await expect(
        swapCatUpgradeable
          .connect(user1)
          .createOffer(
            bridgeToken.address,
            usdcTokenTest.address,
            0,
            60000000,
            BigNumber.from("1000000000000000000000")
          )
      )
        .to.emit(swapCatUpgradeable, "OfferCreated")
        .withArgs(
          bridgeToken.address,
          usdcTokenTest.address,
          0,
          60000000,
          BigNumber.from("1000000000000000000000")
        );

      console.log("OfferCount: ", await swapCatUpgradeable.getOfferCount());

      // User 1 creates an offer
      await bridgeToken
        .connect(user1)
        .approve(
          swapCatUpgradeable.address,
          BigNumber.from("1000000000000000000000")
        );
      await usdcTokenTest
        .connect(user2)
        .approve(
          swapCatUpgradeable.address,
          BigNumber.from("100000000000000000000000")
        );
      console.log(
        "Admin bridgetoken balance: ",
        await bridgeToken.balanceOf(admin.address)
      );
      console.log(
        "User1 usdctoken balance: ",
        await usdcTokenTest.balanceOf(user1.address)
      );

      // TimeLock not finished
      console.log("User2 can not buy when timelock is not finished");
      console.log("Time now: ", await time.latest());
      console.log("unlockTime: ", unlockTime);
      await expect(
        swapCatUpgradeable
          .connect(user2)
          .buy(
            BigNumber.from(0),
            BigNumber.from("60000000"),
            BigNumber.from("10000000000000000")
          )
      ).to.revertedWith("transfer is not valid");

      // Increase time to unlockTime
      await time.increaseTo(unlockTime);
      console.log("User2 can buy when timelock is finished");
      console.log("Time now increased 1 year to: ", await time.latest());
      console.log("unlockTime: ", unlockTime);
      await expect(
        swapCatUpgradeable
          .connect(user2)
          .buy(
            BigNumber.from(0),
            BigNumber.from("60000000"),
            BigNumber.from("10000000000000000")
          )
      )
        .to.emit(swapCatUpgradeable, "OfferAccepted")
        .withArgs(
          0,
          user1.address,
          user2.address,
          BigNumber.from("60000000"),
          BigNumber.from("10000000000000000")
        );

      console.log(
        "User1 USDCToken balance: ",
        await usdcTokenTest.balanceOf(user2.address)
      );

      console.log(
        "User2 BridgeToken balance: ",
        await bridgeToken.balanceOf(user2.address)
      );
    });
  });

  describe("6. Save lost tokens", function () {
    it("should allow withdrawing by the moderator", async function () {
      const {
        bridgeToken,
        swapCatUpgradeable,
        complianceRegistry,
        unlockTime,
        admin,
        moderator,
      } = await loadFixture(makeSuite);

      await complianceRegistry.registerUser(
        swapCatUpgradeable.address,
        [BigNumber.from("100001")],
        [1]
      );
      await complianceRegistry.registerUser(
        moderator.address,
        [BigNumber.from("100001")],
        [1]
      );

      // Admin-owner can transfer before unlockTime
      await bridgeToken.transfer(swapCatUpgradeable.address, 200);
      expect(await bridgeToken.balanceOf(swapCatUpgradeable.address)).to.equal(
        200
      );

      // Manipulate time to unlockTime
      await time.increaseTo(unlockTime);

      // Moderator can withdraw tokens
      await expect(
        swapCatUpgradeable
          .connect(moderator)
          .saveLostTokens(bridgeToken.address)
      )
        .to.emit(bridgeToken, "Transfer")
        .withArgs(
          swapCatUpgradeable.address,
          moderator.address,
          await bridgeToken.balanceOf(swapCatUpgradeable.address)
        );
      expect(await bridgeToken.balanceOf(swapCatUpgradeable.address)).to.equal(
        0
      );
      expect(await bridgeToken.balanceOf(moderator.address)).to.equal(200);

      // Transfer token to the contract a second time
      await bridgeToken.transfer(swapCatUpgradeable.address, 300);
      expect(await bridgeToken.balanceOf(swapCatUpgradeable.address)).to.equal(
        300
      );
      // Moderator can withdraw tokens
      await expect(
        swapCatUpgradeable.connect(admin).saveLostTokens(bridgeToken.address)
      )
        .to.emit(bridgeToken, "Transfer")
        .withArgs(
          swapCatUpgradeable.address,
          moderator.address,
          await bridgeToken.balanceOf(swapCatUpgradeable.address)
        );
      expect(await bridgeToken.balanceOf(swapCatUpgradeable.address)).to.equal(
        0
      );
      expect(await bridgeToken.balanceOf(moderator.address)).to.equal(500);
    });

    it("should not allow withdrawing by non-admin/moderator", async function () {
      const { bridgeToken, swapCatUpgradeable, user1 } = await loadFixture(
        makeSuite
      );

      // User can not withdraw tokens
      await expect(
        swapCatUpgradeable.connect(user1).saveLostTokens(bridgeToken.address)
      ).to.revertedWith(`only admin or moderator can move lost tokens`);
    });

    it("Should not be able to transfer ethers to the contract", async function () {
      const { admin, moderator, swapCatUpgradeable } = await loadFixture(
        makeSuite
      );
      const balanceAdmin = await ethers.provider.getBalance(admin.address);
      const balanceMod = await ethers.provider.getBalance(moderator.address);
      const balanceSwapCat = await ethers.provider.getBalance(
        swapCatUpgradeable.address
      );
      console.log("Admin ether balance ", balanceAdmin.toString());
      console.log("Moderator ether balance ", balanceMod.toString());
      console.log("SwapCat contract ether balance ", balanceSwapCat.toString());

      // Check if the admin can transfer ethers to another address
      await admin.sendTransaction({
        to: moderator.address,
        value: ethers.utils.parseEther("10"), // Admin sends 10 ethers to moderator
      });

      console.log(await ethers.provider.getBalance(moderator.address));
      expect(await ethers.provider.getBalance(moderator.address)).to.equal(
        balanceMod.add(ethers.utils.parseEther("10"))
      );

      expect(
        await ethers.provider.getBalance(swapCatUpgradeable.address)
      ).to.equal(0);
      // Revert when sending ethers to the contract
      await expect(
        admin.sendTransaction({
          to: swapCatUpgradeable.address,
          value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
        })
      ).to.be.revertedWith(
        "function selector was not recognized and there's no fallback nor receive function"
      );
    });
  });
  describe("7. Transfer moderator role", function () {
    it("should not allow non-moderator to transfer moderator role", async function () {
      const { swapCatUpgradeable, admin, user1 } = await loadFixture(makeSuite);
      await expect(
        swapCatUpgradeable.connect(admin).transferModerator(user1.address)
      ).to.revertedWith(`Caller is not moderator`);
    });

    it("should allow moderator to transfer moderator role", async function () {
      const { swapCatUpgradeable, moderator, user1 } = await loadFixture(
        makeSuite
      );
      await expect(
        swapCatUpgradeable.connect(moderator).transferModerator(user1.address)
      )
        .to.emit(swapCatUpgradeable, "ModeratorTransferred")
        .withArgs(moderator.address, user1.address);
    });
  });

  describe("8. Upgradeability", function () {
    it("Should be able to upgrade by the upgrader admin", async function () {
      const { swapCatUpgradeable } = await loadFixture(makeSuite);
      const SwapCatUpgradeableV2 = await ethers.getContractFactory(
        "SwapCatUpgradeableV2"
      );
      const swapCatUpgradeableV2 = (await upgrades.upgradeProxy(
        swapCatUpgradeable.address,
        SwapCatUpgradeableV2,
        { kind: "uups" }
      )) as SwapCatUpgradeableV2;
      await swapCatUpgradeableV2.deployed();
    });
  });
});
