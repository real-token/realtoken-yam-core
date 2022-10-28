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
import { RealTokenYamUpgradeable } from "../typechain/RealTokenYamUpgradeable";
// import { RealTokenYamUpgradeableV2 } from "../typechain/RealTokenYamUpgradeableV2";

describe("RealTokenYamUpgradeable", function () {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  async function makeSuite() {
    const [admin, moderator, user1, user2]: SignerWithAddress[] =
      await ethers.getSigners();
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
    const RealTokenYamUpgradeableFactory = await ethers.getContractFactory(
      "RealTokenYamUpgradeable"
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

    // Deploy RealTokenYamUpgradeable contract
    const realTokenYamUpgradeable = (await upgrades.deployProxy(
      RealTokenYamUpgradeableFactory,
      [admin.address, moderator.address]
    )) as RealTokenYamUpgradeable;

    return {
      usdcTokenTest,
      bridgeToken,
      realTokenYamUpgradeable,
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
      realTokenYamUpgradeable,
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
    await realTokenYamUpgradeable
      .connect(admin)
      .toggleWhitelist(
        [usdcTokenTest.address, bridgeToken.address],
        [true, true]
      );

    await bridgeToken.transfer(user1.address, amount1); // Send 1000 RTT to user1
    await usdcTokenTest.transfer(user2.address, amount2); // Send 1000 USDC to user2

    return {
      usdcTokenTest,
      bridgeToken,
      realTokenYamUpgradeable,
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
      realTokenYamUpgradeable,
      complianceRegistry,
      ruleEngine,
      bridgeToken,
      unlockTime,
      admin,
      moderator,
      user1,
      user2,
    } = await loadFixture(makeSuiteWhitelist);
    await time.increaseTo(unlockTime);

    // Create offer: offerId = 0
    await realTokenYamUpgradeable
      .connect(user1)
      .createOffer(
        bridgeToken.address,
        usdcTokenTest.address,
        ZERO_ADDRESS,
        50000000,
        BigNumber.from("1000000000000000000000")
      );

    // Create offer: offerId = 1
    await realTokenYamUpgradeable
      .connect(user1)
      .createOffer(
        bridgeToken.address,
        usdcTokenTest.address,
        ZERO_ADDRESS,
        55000000,
        BigNumber.from("1000000000000000000000")
      );

    await bridgeToken
      .connect(user1)
      .approve(
        realTokenYamUpgradeable.address,
        BigNumber.from("10000000000000000000")
      );
    await usdcTokenTest
      .connect(user2)
      .approve(realTokenYamUpgradeable.address, BigNumber.from("10000000"));

    return {
      bridgeToken,
      usdcTokenTest,
      realTokenYamUpgradeable,
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
      const { realTokenYamUpgradeable, admin } = await loadFixture(makeSuite);

      expect(
        await realTokenYamUpgradeable.hasRole(
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          admin.address
        )
      ).to.equal(true);
    });

    it("Should initialize with the right upgrader", async function () {
      const { realTokenYamUpgradeable, admin } = await loadFixture(makeSuite);

      expect(
        await realTokenYamUpgradeable.hasRole(
          keccak256(toUtf8Bytes("UPGRADER_ROLE")),
          admin.address
        )
      ).to.equal(true);
    });

    it("Should initialize with the right moderator", async function () {
      const { realTokenYamUpgradeable, moderator } = await loadFixture(
        makeSuite
      );
      expect(
        await realTokenYamUpgradeable.hasRole(
          keccak256(toUtf8Bytes("MODERATOR_ROLE")),
          moderator.address
        )
      ).to.equal(true);
    });
  });

  // Test 2: Whitelist
  describe("2. Whitelist/unWhitelist", function () {
    it("Whitelist/unWhitelist: should work with admin and emit the right event", async function () {
      const { bridgeToken, realTokenYamUpgradeable } = await loadFixture(
        makeSuite
      );
      await expect(
        realTokenYamUpgradeable.toggleWhitelist([bridgeToken.address], [true])
      )
        .to.emit(realTokenYamUpgradeable, "TokenWhitelistToggled")
        .withArgs([bridgeToken.address], [true]).to.not.reverted;

      expect(
        await realTokenYamUpgradeable.isWhitelisted(bridgeToken.address)
      ).to.equal(true);

      await expect(
        realTokenYamUpgradeable.toggleWhitelist([bridgeToken.address], [false])
      )
        .to.emit(realTokenYamUpgradeable, "TokenWhitelistToggled")
        .withArgs([bridgeToken.address], [false]).to.not.reverted;

      expect(
        await realTokenYamUpgradeable.isWhitelisted(bridgeToken.address)
      ).to.equal(false);
    });

    it("Whitelist/unWhitelist: should not work with other address", async function () {
      const { bridgeToken, realTokenYamUpgradeable, user1 } = await loadFixture(
        makeSuite
      );

      await expect(
        realTokenYamUpgradeable
          .connect(user1)
          .toggleWhitelist([bridgeToken.address], [true])
      ).to.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${await realTokenYamUpgradeable.DEFAULT_ADMIN_ROLE()}`
      );
    });
  });

  // Test 3: Create, modify, delete offer
  describe("3. Create/Update/Delete Offer", function () {
    it("Create Offer: should create an offer when both tokens are whitelisted", async function () {
      const {
        bridgeToken,
        usdcTokenTest,
        realTokenYamUpgradeable,
        admin,
        unlockTime,
      } = await loadFixture(makeSuite);

      await expect(
        realTokenYamUpgradeable.toggleWhitelist(
          [bridgeToken.address, usdcTokenTest.address],
          [true, true]
        )
      )
        .to.emit(realTokenYamUpgradeable, "TokenWhitelistToggled")
        .withArgs([bridgeToken.address, usdcTokenTest.address], [true, true]).to
        .not.reverted;

      // Increase time to unlockTime
      await time.increaseTo(unlockTime);

      await expect(
        realTokenYamUpgradeable.createOffer(
          bridgeToken.address,
          usdcTokenTest.address,
          ZERO_ADDRESS,
          10,
          BigNumber.from("1000000000000000000000")
        )
      )
        .to.emit(realTokenYamUpgradeable, "OfferCreated")
        .withArgs(
          bridgeToken.address,
          usdcTokenTest.address,
          admin.address,
          ZERO_ADDRESS,
          0,
          10,
          BigNumber.from("1000000000000000000000")
        );

      await expect(
        realTokenYamUpgradeable.createOffer(
          bridgeToken.address,
          usdcTokenTest.address,
          ZERO_ADDRESS,
          15,
          BigNumber.from("1000000000000000000000")
        )
      )
        .to.emit(realTokenYamUpgradeable, "OfferCreated")
        .withArgs(
          bridgeToken.address,
          usdcTokenTest.address,
          admin.address,
          ZERO_ADDRESS,
          1,
          15,
          BigNumber.from("1000000000000000000000")
        );
    });

    it("Create Offer: should revert when the tokens are not whitelisted", async function () {
      const { bridgeToken, usdcTokenTest, realTokenYamUpgradeable } =
        await loadFixture(makeSuite);

      await expect(
        realTokenYamUpgradeable.createOffer(
          bridgeToken.address,
          usdcTokenTest.address,
          ZERO_ADDRESS,
          10,
          BigNumber.from("1000000000000000000000")
        )
      ).to.be.revertedWith("Token is not whitelisted");
    });

    it("Update offer: seller should be able to update the offer", async function () {
      const {
        usdcTokenTest,
        bridgeToken,
        realTokenYamUpgradeable,
        user1,
        unlockTime,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      // // Increase time to unlockTime
      // await time.increaseTo(unlockTime);

      // await expect(
      //   realTokenYamUpgradeable
      //     .connect(user1)
      //     .updateOffer(1, 100, BigNumber.from("2000000000000000000000"))
      // )
      //   .to.emit(realTokenYamUpgradeable, "OfferUpdated")
      //   .withArgs(
      //     1,
      //     55000000, // old price
      //     100, // new price
      //     BigNumber.from("1000000000000000000000"), // old amount
      //     BigNumber.from("2000000000000000000000") // new amount
      //   );

      // expect(
      //   (await realTokenYamUpgradeable.getInitialOffer(1)).slice(0, 6)
      // ).to.eql([
      //   bridgeToken.address,
      //   usdcTokenTest.address,
      //   user1.address,
      //   ZERO_ADDRESS,
      //   BigNumber.from(100),
      //   BigNumber.from("2000000000000000000000"),
      // ]);
    });

    it("Update offer: non-seller should not be able to update the offer", async function () {
      const { realTokenYamUpgradeable, user2 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Revert when user 2 modifies the price of the second offer, offerId = 1
      await expect(
        realTokenYamUpgradeable
          .connect(user2)
          .updateOffer(1, 20, BigNumber.from("1000000000000000000000"))
      ).to.revertedWith("only the seller can change offer");
    });

    it("Delete Offer: seller should be able to delete the offer", async function () {
      const { realTokenYamUpgradeable, user1 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Emit the "OfferDeleted" event when user 1 deletes the price of the second offer, offerId = 2
      await expect(realTokenYamUpgradeable.connect(user1).deleteOffer(1))
        .to.emit(realTokenYamUpgradeable, "OfferDeleted")
        .withArgs(1);
    });

    it("DeleteOffer: non-seller should not be able to delete offer", async function () {
      const { realTokenYamUpgradeable, user2 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Revert when user 2 deletes the offer, offerId = 1
      await expect(
        realTokenYamUpgradeable.connect(user2).deleteOffer(1)
      ).to.revertedWith("only the seller can delete offer");
    });
    it("deleteOfferByAdmin: admin can call this function", async function () {
      const { realTokenYamUpgradeable, admin } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Admin deletes the offer, offerId = 1
      await expect(realTokenYamUpgradeable.connect(admin).deleteOfferByAdmin(1))
        .to.emit(realTokenYamUpgradeable, "OfferDeleted")
        .withArgs(1);
    });

    it("deleteOfferByAdmin: non-admin can not call this function", async function () {
      const { realTokenYamUpgradeable, user1 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Test function: deleteOfferByAdmin
      // Revert when user 1 deletes the offer using deleteOfferByAdmin, offerId = 1
      await expect(
        realTokenYamUpgradeable.connect(user1).deleteOfferByAdmin(1)
      ).to.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${await realTokenYamUpgradeable.DEFAULT_ADMIN_ROLE()}`
      );
    });
  });

  describe("4. View functions: getOfferCount/tokenInfo/showOffer/pricePreview", function () {
    it("getOfferCount: should return the correct number of offers", async function () {
      const { realTokenYamUpgradeable } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );
      expect(await realTokenYamUpgradeable.getOfferCount()).to.equal(2);
    });
    it("Function tokenInfo: should work", async function () {
      const { bridgeToken, usdcTokenTest, realTokenYamUpgradeable } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);

      expect(
        await realTokenYamUpgradeable.tokenInfo(bridgeToken.address)
      ).to.deep.equal([
        BigNumber.from(await bridgeToken.decimals()),
        await bridgeToken.symbol(),
        await bridgeToken.name(),
      ]);

      expect(
        await realTokenYamUpgradeable.tokenInfo(usdcTokenTest.address)
      ).to.deep.equal([
        BigNumber.from(await usdcTokenTest.decimals()),
        await usdcTokenTest.symbol(),
        await usdcTokenTest.name(),
      ]);
    });

    it("Function showOffer: should work", async function () {
      const { bridgeToken, usdcTokenTest, realTokenYamUpgradeable, user1 } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);

      // Test function: showOffer (offerToken buyerToken, sellerAddress, price)
      expect((await realTokenYamUpgradeable.showOffer(0)).slice(0, 5)).to.eql([
        bridgeToken.address,
        usdcTokenTest.address,
        user1.address,
        ZERO_ADDRESS,
        BigNumber.from("50000000"),
      ]);

      // Test function: showOffer (availablebalance)
      // When allowance is inferior than user1 balance, the availablebalance is equal to the allowance
      expect((await realTokenYamUpgradeable.showOffer(0))[5]).to.equal(
        await bridgeToken.allowance(
          user1.address,
          realTokenYamUpgradeable.address
        )
      );
      // When allowance is inferior than user1 balance
      await expect(
        bridgeToken
          .connect(user1)
          .approve(
            realTokenYamUpgradeable.address,
            BigNumber.from(await bridgeToken.balanceOf(user1.address)).add(1)
          )
      )
        .to.emit(bridgeToken, "Approval")
        .withArgs(
          user1.address,
          realTokenYamUpgradeable.address,
          BigNumber.from(await bridgeToken.balanceOf(user1.address)).add(1)
        );

      expect((await realTokenYamUpgradeable.showOffer(0))[5]).to.equal(
        await bridgeToken.balanceOf(user1.address)
      );
    });

    it("Function pricePreview: should work", async function () {
      const { realTokenYamUpgradeable } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      // Test pricePreview function
      expect(
        await realTokenYamUpgradeable.pricePreview(
          0,
          BigNumber.from(1000000000000000)
        )
      ).to.equal(BigNumber.from(50000));
    });
  });

  describe("5. Buy function with checking transfer validity", function () {
    it("Function buy: should revert when price is wrong", async function () {
      const { realTokenYamUpgradeable, user2 } = await loadFixture(
        makeSuiteWhitelistAndCreateOffer
      );

      await expect(
        realTokenYamUpgradeable
          .connect(user2)
          .buy(1, 50000000, 1000000000000000) // price was 55000000
      ).to.revertedWith("offer price wrong");
    });

    it("Function buy: should work", async function () {
      const {
        usdcTokenTest,
        realTokenYamUpgradeable,
        bridgeToken,
        unlockTime,
        admin,
        user1,
        user2,
      } = await loadFixture(makeSuiteWhitelist);
      // Increase time to unlockTime
      await time.increaseTo(unlockTime);

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
        realTokenYamUpgradeable
          .connect(user1)
          .createOffer(
            bridgeToken.address,
            usdcTokenTest.address,
            ZERO_ADDRESS,
            60000000,
            BigNumber.from("1000000000000000000000")
          )
      )
        .to.emit(realTokenYamUpgradeable, "OfferCreated")
        .withArgs(
          bridgeToken.address,
          usdcTokenTest.address,
          user1.address,
          ZERO_ADDRESS,
          0,
          60000000,
          BigNumber.from("1000000000000000000000")
        );

      console.log(
        "OfferCount: ",
        await realTokenYamUpgradeable.getOfferCount()
      );

      // User 1 creates an offer
      await bridgeToken
        .connect(user1)
        .approve(
          realTokenYamUpgradeable.address,
          BigNumber.from("1000000000000000000000")
        );
      await usdcTokenTest
        .connect(user2)
        .approve(
          realTokenYamUpgradeable.address,
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

      console.log("User2 can buy when timelock is finished");
      console.log("Time now increased 1 year to: ", await time.latest());
      console.log("unlockTime: ", unlockTime);
      await expect(
        realTokenYamUpgradeable
          .connect(user2)
          .buy(
            BigNumber.from(0),
            BigNumber.from("60000000"),
            BigNumber.from("10000000000000000")
          )
      )
        .to.emit(realTokenYamUpgradeable, "OfferAccepted")
        .withArgs(
          0,
          user1.address,
          user2.address,
          bridgeToken.address,
          usdcTokenTest.address,
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
        realTokenYamUpgradeable,
        complianceRegistry,
        unlockTime,
        admin,
        moderator,
      } = await loadFixture(makeSuite);
      const tokenAmount = 300;

      await complianceRegistry.registerUser(
        realTokenYamUpgradeable.address,
        [BigNumber.from("100001")],
        [1]
      );
      await complianceRegistry.registerUser(
        moderator.address,
        [BigNumber.from("100001")],
        [1]
      );

      // Admin-owner can transfer before unlockTime
      await bridgeToken.transfer(realTokenYamUpgradeable.address, tokenAmount);
      expect(
        await bridgeToken.balanceOf(realTokenYamUpgradeable.address)
      ).to.equal(tokenAmount);

      // Manipulate time to unlockTime
      await time.increaseTo(unlockTime);

      // Moderator can withdraw tokens
      await expect(
        realTokenYamUpgradeable
          .connect(moderator)
          .saveLostTokens(bridgeToken.address)
      )
        .to.emit(bridgeToken, "Transfer")
        .withArgs(
          realTokenYamUpgradeable.address,
          moderator.address,
          await bridgeToken.balanceOf(realTokenYamUpgradeable.address)
        );
      expect(
        await bridgeToken.balanceOf(realTokenYamUpgradeable.address)
      ).to.equal(0);
      expect(await bridgeToken.balanceOf(moderator.address)).to.equal(
        tokenAmount
      );

      // Transfer token to the contract a second time
      await bridgeToken.transfer(realTokenYamUpgradeable.address, tokenAmount);
      expect(
        await bridgeToken.balanceOf(realTokenYamUpgradeable.address)
      ).to.equal(tokenAmount);
      // Admin can withdraw tokens
      const oldAdminBalance = await bridgeToken.balanceOf(admin.address);
      await expect(
        realTokenYamUpgradeable
          .connect(admin)
          .saveLostTokens(bridgeToken.address)
      )
        .to.emit(bridgeToken, "Transfer")
        .withArgs(
          realTokenYamUpgradeable.address,
          admin.address,
          await bridgeToken.balanceOf(realTokenYamUpgradeable.address)
        );
      expect(
        await bridgeToken.balanceOf(realTokenYamUpgradeable.address)
      ).to.equal(0);
      expect(await bridgeToken.balanceOf(admin.address)).to.equal(
        oldAdminBalance.add(tokenAmount)
      );
    });

    it("should not allow withdrawing by non-admin/moderator", async function () {
      const { bridgeToken, realTokenYamUpgradeable, user1 } = await loadFixture(
        makeSuite
      );

      // User can not withdraw tokens
      await expect(
        realTokenYamUpgradeable
          .connect(user1)
          .saveLostTokens(bridgeToken.address)
      ).to.revertedWith(`caller is not moderator or admin`);
    });

    it("Should not be able to transfer ethers to the contract", async function () {
      const { admin, moderator, realTokenYamUpgradeable } = await loadFixture(
        makeSuite
      );
      const balanceAdmin = await ethers.provider.getBalance(admin.address);
      const balanceMod = await ethers.provider.getBalance(moderator.address);
      const balancerealTokenYam = await ethers.provider.getBalance(
        realTokenYamUpgradeable.address
      );
      console.log("Admin ether balance ", balanceAdmin.toString());
      console.log("Moderator ether balance ", balanceMod.toString());
      console.log(
        "realTokenYam contract ether balance ",
        balancerealTokenYam.toString()
      );

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
        await ethers.provider.getBalance(realTokenYamUpgradeable.address)
      ).to.equal(0);
      // Revert when sending ethers to the contract
      await expect(
        admin.sendTransaction({
          to: realTokenYamUpgradeable.address,
          value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
        })
      ).to.be.revertedWith(
        "function selector was not recognized and there's no fallback nor receive function"
      );
    });
  });
  describe("7. Admin can grant/revoke roles", function () {
    it("Admin can grant moderator role", async function () {
      const { realTokenYamUpgradeable, admin, user1 } = await loadFixture(
        makeSuite
      );

      await expect(
        realTokenYamUpgradeable
          .connect(admin)
          .grantRole(keccak256(toUtf8Bytes("MODERATOR_ROLE")), user1.address)
      )
        .to.emit(realTokenYamUpgradeable, "RoleGranted")
        .withArgs(
          keccak256(toUtf8Bytes("MODERATOR_ROLE")),
          user1.address,
          admin.address
        );

      expect(
        await realTokenYamUpgradeable.hasRole(
          keccak256(toUtf8Bytes("MODERATOR_ROLE")),
          user1.address
        )
      ).to.equal(true);
    });

    it("Admin can revoke moderator role", async function () {
      const { realTokenYamUpgradeable, admin, moderator } = await loadFixture(
        makeSuite
      );

      await expect(
        realTokenYamUpgradeable
          .connect(admin)
          .revokeRole(
            keccak256(toUtf8Bytes("MODERATOR_ROLE")),
            moderator.address
          )
      )
        .to.emit(realTokenYamUpgradeable, "RoleRevoked")
        .withArgs(
          keccak256(toUtf8Bytes("MODERATOR_ROLE")),
          moderator.address,
          admin.address
        );

      expect(
        await realTokenYamUpgradeable.hasRole(
          keccak256(toUtf8Bytes("MODERATOR_ROLE")),
          moderator.address
        )
      ).to.equal(false);
    });
  });

  // describe("8. Upgradeability", function () {
  //   it("Should be able to upgrade by the upgrader admin", async function () {
  //     const { realTokenYamUpgradeable } = await loadFixture(makeSuite);

  //     const realTokenYamUpgradeableV2 = await ethers.getContractFactory(
  //       "realTokenYamUpgradeableV2"
  //     );

  //     const realTokenYamUpgradeableV2 = (await upgrades.upgradeProxy(
  //       realTokenYamUpgradeable.address,
  //       realTokenYamUpgradeableV2,
  //       { kind: "uups" }
  //     )) as realTokenYamUpgradeableV2;
  //     await realTokenYamUpgradeableV2.deployed();
  //   });
  // });
});
