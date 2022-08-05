import { Processor } from "./../typechain/Processor.d";
import { RuleEngine } from "./../typechain/RuleEngine.d";
import { BridgeERC20__factory } from "./../typechain/factories/BridgeERC20__factory";
import { BridgeToken } from "../typechain/BridgeToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import { SwapCatUpgradeable } from "../typechain/SwapCatUpgradeable";
import { SwapCatUpgradeableV2 } from "../typechain/SwapCatUpgradeableV2";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber } from "ethers";
import { ComplianceRegistry } from "../typechain/ComplianceRegistry";

describe("SwapCatUpgradeable", function () {
  async function makeSuite() {
    const [admin, moderator, user1, user2]: SignerWithAddress[] =
      await ethers.getSigners();
    const COMPLIANCE_REGISTRY = "0x3221a28ed2b2e955da64d1d299956f277562c95c";
    const TRUSTED_INTERMEDIARY = "0x296033cb983747b68911244ec1a3f01d7708851b";

    const RealTokenTest = await ethers.getContractFactory("RealTokenTest");
    const realTokenTest = await RealTokenTest.deploy();
    const USDCTokenTest = await ethers.getContractFactory("USDCTokenTest");
    const usdcTokenTest = await USDCTokenTest.deploy();

    const SwapCatUpgradeableFactory = await ethers.getContractFactory(
      "SwapCatUpgradeable"
    );

    const swapCatUpgradeable = (await upgrades.deployProxy(
      SwapCatUpgradeableFactory,
      [
        admin.address,
        moderator.address,
        COMPLIANCE_REGISTRY,
        TRUSTED_INTERMEDIARY,
      ]
    )) as SwapCatUpgradeable;

    return {
      realTokenTest,
      usdcTokenTest,
      swapCatUpgradeable,
      admin,
      moderator,
      user1,
      user2,
    };
  }

  async function makeSuiteWhitelist() {
    const {
      realTokenTest,
      usdcTokenTest,
      swapCatUpgradeable,
      admin,
      moderator,
      user1,
      user2,
    } = await loadFixture(makeSuite);
    const amount1 = BigNumber.from("1000000000000000000000"); // 1000 RTT
    const amount2 = BigNumber.from("1000000000"); // 1000 USDC
    await swapCatUpgradeable
      .connect(admin)
      .toggleWhitelist(realTokenTest.address);
    await swapCatUpgradeable
      .connect(admin)
      .toggleWhitelist(usdcTokenTest.address);
    await realTokenTest.transfer(user1.address, amount1); // Send 1000 RTT to user1
    await usdcTokenTest.transfer(user2.address, amount2); // Send 1000 USDC to user2

    return {
      realTokenTest,
      usdcTokenTest,
      swapCatUpgradeable,
      admin,
      moderator,
      user1,
      user2,
    };
  }

  async function makeSuiteWhitelistAndCreateOffer() {
    const {
      realTokenTest,
      usdcTokenTest,
      swapCatUpgradeable,
      admin,
      moderator,
      user1,
      user2,
    } = await loadFixture(makeSuiteWhitelist);
    // Create offer: offerId = 0
    await swapCatUpgradeable
      .connect(user1)
      .createOffer(realTokenTest.address, usdcTokenTest.address, 50000000, 0);

    // Create offer: offerId = 1
    await swapCatUpgradeable
      .connect(user1)
      .createOffer(realTokenTest.address, usdcTokenTest.address, 55000000, 0);

    await realTokenTest
      .connect(user1)
      .approve(
        swapCatUpgradeable.address,
        BigNumber.from("10000000000000000000")
      );
    await usdcTokenTest
      .connect(user2)
      .approve(swapCatUpgradeable.address, BigNumber.from("10000000"));

    return {
      realTokenTest,
      usdcTokenTest,
      swapCatUpgradeable,
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
    it("Whitelist/unWhitelist: should work with admin", async function () {
      const { realTokenTest, swapCatUpgradeable } = await loadFixture(
        makeSuite
      );
      await swapCatUpgradeable.toggleWhitelist(realTokenTest.address);

      expect(
        await swapCatUpgradeable.isWhitelisted(realTokenTest.address)
      ).to.equal(true);

      await swapCatUpgradeable.toggleWhitelist(realTokenTest.address);

      expect(
        await swapCatUpgradeable.isWhitelisted(realTokenTest.address)
      ).to.equal(false);
    });

    it("Whitelist/unWhitelist: should not work with other address", async function () {
      const { realTokenTest, swapCatUpgradeable, user1 } = await loadFixture(
        makeSuite
      );

      await expect(
        swapCatUpgradeable.connect(user1).toggleWhitelist(realTokenTest.address)
      ).to.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${await swapCatUpgradeable.DEFAULT_ADMIN_ROLE()}`
      );
    });

    it("Whitelist/unWhitelist should emit the right event", async function () {
      const { realTokenTest, swapCatUpgradeable } = await loadFixture(
        makeSuite
      );
      await expect(swapCatUpgradeable.toggleWhitelist(realTokenTest.address))
        .to.emit(swapCatUpgradeable, "TokenWhitelisted")
        .withArgs(realTokenTest.address);

      await expect(swapCatUpgradeable.toggleWhitelist(realTokenTest.address))
        .to.emit(swapCatUpgradeable, "TokenUnWhitelisted")
        .withArgs(realTokenTest.address);
    });
  });

  describe("3. Create/Modify/Delete Offer", function () {
    it("Create Offer: should create an offer when both tokens are whitelisted", async function () {
      const { realTokenTest, usdcTokenTest, swapCatUpgradeable } =
        await loadFixture(makeSuite);

      await expect(swapCatUpgradeable.toggleWhitelist(realTokenTest.address))
        .to.emit(swapCatUpgradeable, "TokenWhitelisted")
        .withArgs(realTokenTest.address);

      await expect(swapCatUpgradeable.toggleWhitelist(usdcTokenTest.address))
        .to.emit(swapCatUpgradeable, "TokenWhitelisted")
        .withArgs(usdcTokenTest.address);

      await expect(
        swapCatUpgradeable.createOffer(
          realTokenTest.address,
          usdcTokenTest.address,
          10,
          0
        )
      )
        .to.emit(swapCatUpgradeable, "OfferCreated")
        .withArgs(realTokenTest.address, usdcTokenTest.address, 10, 0);

      await expect(
        swapCatUpgradeable.createOffer(
          realTokenTest.address,
          usdcTokenTest.address,
          15,
          0
        )
      )
        .to.emit(swapCatUpgradeable, "OfferCreated")
        .withArgs(realTokenTest.address, usdcTokenTest.address, 15, 1);
    });

    it("Create Offer: should revert when the tokens are not whitelisted", async function () {
      const { realTokenTest, usdcTokenTest, swapCatUpgradeable } =
        await loadFixture(makeSuite);

      await expect(
        swapCatUpgradeable.createOffer(
          realTokenTest.address,
          usdcTokenTest.address,
          10,
          0
        )
      ).to.be.revertedWith("Token is not whitelisted");
    });

    it("Modify offer: seller should be able to modify the offer", async function () {
      const { realTokenTest, usdcTokenTest, swapCatUpgradeable, user1 } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);
      await expect(
        swapCatUpgradeable
          .connect(user1)
          .createOffer(realTokenTest.address, usdcTokenTest.address, 100, 1)
      )
        .to.emit(swapCatUpgradeable, "OfferCreated")
        .withArgs(realTokenTest.address, usdcTokenTest.address, 100, 1);
    });

    it("Modify offer: non-seller should not be able to modify the offer", async function () {
      const { realTokenTest, usdcTokenTest, swapCatUpgradeable, user2 } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);

      // Revert when user 2 modifies the price of the second offer, offerId = 1
      await expect(
        swapCatUpgradeable
          .connect(user2)
          .createOffer(realTokenTest.address, usdcTokenTest.address, 20, 1)
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
      expect(await swapCatUpgradeable.getOfferCount()).to.equal(1);
    });
    it("Function tokenInfo: should work", async function () {
      const { realTokenTest, usdcTokenTest, swapCatUpgradeable } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);
      expect(
        await swapCatUpgradeable.tokenInfo(realTokenTest.address)
      ).to.deep.equal([
        BigNumber.from(await realTokenTest.decimals()),
        await realTokenTest.symbol(),
        await realTokenTest.name(),
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
      const { realTokenTest, usdcTokenTest, swapCatUpgradeable, user1 } =
        await loadFixture(makeSuiteWhitelistAndCreateOffer);

      // Test function: showOffer (offerToken buyerToken, sellerAddress, price)
      expect((await swapCatUpgradeable.showOffer(0)).slice(0, 4)).to.eql([
        realTokenTest.address,
        usdcTokenTest.address,
        user1.address,
        BigNumber.from("50000000"),
      ]);

      // Test function: showOffer (availablebalance)
      // When allowance is inferior than user1 balance, the availablebalance is equal to the allowance
      expect((await swapCatUpgradeable.showOffer(0))[4]).to.equal(
        await realTokenTest.allowance(user1.address, swapCatUpgradeable.address)
      );
      // When allowance is inferior than user1 balance
      await expect(
        realTokenTest
          .connect(user1)
          .approve(
            swapCatUpgradeable.address,
            BigNumber.from(await realTokenTest.balanceOf(user1.address)).add(1)
          )
      )
        .to.emit(realTokenTest, "Approval")
        .withArgs(
          user1.address,
          swapCatUpgradeable.address,
          BigNumber.from(await realTokenTest.balanceOf(user1.address)).add(1)
        );
      expect((await swapCatUpgradeable.showOffer(0))[4]).to.equal(
        await realTokenTest.balanceOf(user1.address)
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
        swapCatUpgradeable.connect(user2).buy(1, 1000000000000000, 50000000) // price was 55000000
      ).to.revertedWith("offer price wrong");
    });
    it("Function buy: should work", async function () {
      const {
        realTokenTest,
        usdcTokenTest,
        swapCatUpgradeable,
        admin,
        user1,
        user2,
      } = await loadFixture(makeSuiteWhitelistAndCreateOffer);

      const RuleEngineFactory = await ethers.getContractFactory("RuleEngine");
      const ProcessorFactory = await ethers.getContractFactory("Processor");
      const BridgeTokenFactory = await ethers.getContractFactory("BridgeToken");
      const ComplianceRegistryFactory = await ethers.getContractFactory(
        "ComplianceRegistry"
      );

      const complianceRegistry = (await upgrades.deployProxy(
        ComplianceRegistryFactory,
        [admin.address] // owner address
      )) as ComplianceRegistry;

      const ruleEngine = (await upgrades.deployProxy(RuleEngineFactory, [
        admin.address, // owner address
      ])) as RuleEngine;

      const processor = (await upgrades.deployProxy(
        ProcessorFactory,
        [admin.address, ruleEngine.address], // owner address, ruleEngine address
        { initializer: "initialize(address owner, address _ruleEngine)" }
      )) as Processor;

      const bridgeToken = await upgrades.deployProxy(
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
      );

      // TODO: deploy bridge token to test 3 rules
      // Test buy function
      // await expect(
      //   swapCatUpgradeable.connect(user2).buy(1, 1000000000000000, 55000000)
      // ).to.emit(swapCatUpgradeable, "OfferAccepted");
    });
  });

  describe("6. Save lost tokens", function () {
    it("should allow withdrawing by the moderator", async function () {
      const { realTokenTest, swapCatUpgradeable, moderator } =
        await loadFixture(makeSuite);

      await realTokenTest.transfer(swapCatUpgradeable.address, 200);
      expect(
        await realTokenTest.balanceOf(swapCatUpgradeable.address)
      ).to.equal(200);

      // Moderator can withdraw tokens
      await expect(
        swapCatUpgradeable
          .connect(moderator)
          .saveLostTokens(realTokenTest.address)
      )
        .to.emit(realTokenTest, "Transfer")
        .withArgs(
          swapCatUpgradeable.address,
          moderator.address,
          await realTokenTest.balanceOf(swapCatUpgradeable.address)
        );
      expect(await realTokenTest.balanceOf(moderator.address)).to.equal(200);
    });

    it("should not allow withdrawing by non-moderator", async function () {
      const { realTokenTest, swapCatUpgradeable, admin, user1 } =
        await loadFixture(makeSuite);

      // Admin can not withdraw tokens
      await expect(
        swapCatUpgradeable.connect(admin).saveLostTokens(realTokenTest.address)
      ).to.revertedWith(`Caller is not moderator`);

      // User can not withdraw tokens
      await expect(
        swapCatUpgradeable.connect(user1).saveLostTokens(realTokenTest.address)
      ).to.revertedWith(`Caller is not moderator`);
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

  // TODO Upgradeability working, uncomment when the contract is finalized
  // describe("8. Upgradeability", function () {
  // it("Should be able to upgrade by the upgrader admin", async function () {
  //   const { swapCatUpgradeable } = await loadFixture(makeSuite);
  //   const SwapCatUpgradeableV2 = await ethers.getContractFactory(
  //     "SwapCatUpgradeableV2"
  //   );
  //   const swapCatUpgradeableV2 = (await upgrades.upgradeProxy(
  //     swapCatUpgradeable.address,
  //     SwapCatUpgradeableV2,
  //     { kind: "uups" }
  //   )) as SwapCatUpgradeableV2;
  //   await swapCatUpgradeableV2.deployed();
  // });

  //   it("Should not be able to upgrade by others", async function () {});
  // });
});
