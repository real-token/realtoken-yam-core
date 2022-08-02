import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import { SwapCatUpgradeable } from "../typechain/SwapCatUpgradeable";
import { SwapCatUpgradeableV2 } from "../typechain/SwapCatUpgradeableV2";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

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

    it("Modify Offer/Delete Offer by owner: should work", async function () {
      const { realTokenTest, usdcTokenTest, swapCatUpgradeable, user1, user2 } =
        await loadFixture(makeSuite);

      // Whitelist the RealTokenTest
      await expect(swapCatUpgradeable.toggleWhitelist(realTokenTest.address))
        .to.emit(swapCatUpgradeable, "TokenWhitelisted")
        .withArgs(realTokenTest.address);
      // Whitelist the USDCTokenTest
      await expect(swapCatUpgradeable.toggleWhitelist(usdcTokenTest.address))
        .to.emit(swapCatUpgradeable, "TokenWhitelisted")
        .withArgs(usdcTokenTest.address);

      // User 1 creates the first offer, offerId = 0 (only for testing)
      await expect(
        swapCatUpgradeable
          .connect(user1)
          .createOffer(realTokenTest.address, usdcTokenTest.address, 10, 0)
      )
        .to.emit(swapCatUpgradeable, "OfferCreated")
        .withArgs(realTokenTest.address, usdcTokenTest.address, 10, 0);

      // User 1 creates the second offer, offerId = 1
      await expect(
        swapCatUpgradeable
          .connect(user1)
          .createOffer(realTokenTest.address, usdcTokenTest.address, 20, 0)
      )
        .to.emit(swapCatUpgradeable, "OfferCreated")
        .withArgs(realTokenTest.address, usdcTokenTest.address, 20, 1);

      // User 1 Modifies the price of the second offer, offerId = 1
      await expect(
        swapCatUpgradeable
          .connect(user1)
          .createOffer(realTokenTest.address, usdcTokenTest.address, 30, 1)
      )
        .to.emit(swapCatUpgradeable, "OfferCreated")
        .withArgs(realTokenTest.address, usdcTokenTest.address, 30, 1);

      expect(await swapCatUpgradeable.getOfferCount()).to.equal(1);

      // Revert when user 2 modifies the price of the second offer, offerId = 1
      await expect(
        swapCatUpgradeable
          .connect(user2)
          .createOffer(realTokenTest.address, usdcTokenTest.address, 20, 1)
      ).to.revertedWith("only the seller can change offer");

      // Revert when user 2 deletes the price of the second offer, offerId = 1
      await expect(
        swapCatUpgradeable.connect(user2).deleteOffer(1)
      ).to.revertedWith("only the seller can delete offer");

      // Emit the "OfferDeleted" event when user 1 deletes the price of the second offer, offerId = 1
      await expect(swapCatUpgradeable.connect(user1).deleteOffer(1))
        .to.emit(swapCatUpgradeable, "OfferDeleted")
        .withArgs(1);
    });

    it("Buy: should work", async function () {
      const { realTokenTest, usdcTokenTest, swapCatUpgradeable, user1, user2 } =
        await loadFixture(makeSuite);

      await expect(swapCatUpgradeable.toggleWhitelist(realTokenTest.address))
        .to.emit(swapCatUpgradeable, "TokenWhitelisted")
        .withArgs(realTokenTest.address);

      await expect(swapCatUpgradeable.toggleWhitelist(usdcTokenTest.address))
        .to.emit(swapCatUpgradeable, "TokenWhitelisted")
        .withArgs(usdcTokenTest.address);

      await realTokenTest.transfer(user1.address, 200);
      expect(await realTokenTest.balanceOf(user1.address)).to.equal(200);
      await usdcTokenTest.transfer(user2.address, 200);
      expect(await usdcTokenTest.balanceOf(user2.address)).to.equal(200);

      await expect(
        realTokenTest.connect(user1).approve(swapCatUpgradeable.address, 20)
      )
        .to.emit(realTokenTest, "Approval")
        .withArgs(user1.address, swapCatUpgradeable.address, 20);
      expect(
        await realTokenTest.allowance(user1.address, swapCatUpgradeable.address)
      ).to.equal(20);

      await expect(
        usdcTokenTest.connect(user2).approve(swapCatUpgradeable.address, 200)
      )
        .to.emit(usdcTokenTest, "Approval")
        .withArgs(user2.address, swapCatUpgradeable.address, 200);
      expect(
        await usdcTokenTest.allowance(user2.address, swapCatUpgradeable.address)
      ).to.equal(200);

      await expect(
        swapCatUpgradeable
          .connect(user1)
          .createOffer(realTokenTest.address, usdcTokenTest.address, 10, 0)
      )
        .to.emit(swapCatUpgradeable, "OfferCreated")
        .withArgs(realTokenTest.address, usdcTokenTest.address, 10, 0);

      // Test tokenInfo function
      expect(
        (await swapCatUpgradeable.tokenInfo(realTokenTest.address))[0]
      ).to.equal(await realTokenTest.decimals());
      expect(
        (await swapCatUpgradeable.tokenInfo(realTokenTest.address)).slice(1)
      ).to.deep.equal([
        await realTokenTest.symbol(),
        await realTokenTest.name(),
      ]);

      // Test showOffer function
      expect((await swapCatUpgradeable.showOffer(0)).slice(0, 3)).to.deep.equal(
        [realTokenTest.address, usdcTokenTest.address, user1.address]
      );
      expect((await swapCatUpgradeable.showOffer(0))[3]).to.equal(10);

      // Test showOffer balanceallow
      // When allowance is inferior than user1 balance
      expect((await swapCatUpgradeable.showOffer(0))[4]).to.equal(
        await realTokenTest.allowance(user1.address, swapCatUpgradeable.address)
      );

      // When allowance is inferior than user1 balance
      await expect(
        realTokenTest.connect(user1).approve(swapCatUpgradeable.address, 300)
      )
        .to.emit(realTokenTest, "Approval")
        .withArgs(user1.address, swapCatUpgradeable.address, 300);
      expect((await swapCatUpgradeable.showOffer(0))[4]).to.equal(
        await realTokenTest.balanceOf(user1.address)
      );

      // TODO check price calculation
      // Test pricePreview function
      // expect(await swapCatUpgradeable.pricePreview(0, 15)).to.equal(150);
    });
  });

  describe("4. Save lost tokens", function () {
    it("Should not be able to transfer ethers to the contract", async function () {
      const { admin, moderator, swapCatUpgradeable } = await loadFixture(
        makeSuite
      );
      const provider = await ethers.getDefaultProvider();
      await expect(
        admin.sendTransaction({
          to: swapCatUpgradeable.address,
          value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
        })
      ).to.be.revertedWith(
        "function selector was not recognized and there's no fallback nor receive function"
      );

      // TODO check if the admin can transfer ethers to another address
      // await admin.sendTransaction({
      //   to: moderator.address,
      //   value: ethers.utils.parseEther("10"), // Sends exactly 1.0 ether
      // });
      // console.log(await provider.getBalance(moderator.address));
      // expect(await provider.getBalance(moderator.address)).to.equal(1);
      // expect(await provider.getBalance(swapCatUpgradeable.address)).to.equal(0);
    });

    it("should allow withdrawing by the owner", async function () {
      const { realTokenTest, swapCatUpgradeable, admin, moderator, user1 } =
        await loadFixture(makeSuite);

      await expect(swapCatUpgradeable.toggleWhitelist(realTokenTest.address))
        .to.emit(swapCatUpgradeable, "TokenWhitelisted")
        .withArgs(realTokenTest.address);

      await realTokenTest.transfer(swapCatUpgradeable.address, 200);
      expect(
        await realTokenTest.balanceOf(swapCatUpgradeable.address)
      ).to.equal(200);

      await expect(
        swapCatUpgradeable.connect(admin).saveLostTokens(realTokenTest.address)
      ).to.revertedWith(`Caller is not moderator`);

      await expect(
        swapCatUpgradeable.connect(user1).saveLostTokens(realTokenTest.address)
      ).to.revertedWith(`Caller is not moderator`);

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
  });

  // describe("5. Upgradeability", function () {
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

  // TODO add more tests
});
