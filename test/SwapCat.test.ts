import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import { SwapCatUpgradeable } from "../typechain/SwapCatUpgradeable";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("SwapCatUpgradeable", function () {
  async function makeSuite() {
    const [admin, adminFee, user1, user2]: SignerWithAddress[] =
      await ethers.getSigners();

    const RealTokenTest = await ethers.getContractFactory("RealTokenTest");
    const realTokenTest = await RealTokenTest.deploy();
    const USDCTokenTest = await ethers.getContractFactory("USDCTokenTest");
    const usdcTokenTest = await USDCTokenTest.deploy();

    const SwapCatUpgradeableFactory = await ethers.getContractFactory(
      "SwapCatUpgradeable"
    );

    const swapCatUpgradeable = (await upgrades.deployProxy(
      SwapCatUpgradeableFactory,
      [admin.address, adminFee.address]
    )) as SwapCatUpgradeable;

    return {
      realTokenTest,
      usdcTokenTest,
      swapCatUpgradeable,
      admin,
      adminFee,
      user1,
      user2,
    };
  }

  describe("Deployment", function () {
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

    it("Should initialize with the right adminFee", async function () {
      const { swapCatUpgradeable, adminFee } = await loadFixture(makeSuite);

      expect(await swapCatUpgradeable.admin()).to.equal(adminFee.address);
    });
  });

  describe("Upgradeability", function () {
    it("Should be able to upgrade by the upgrader admin", async function () {});

    it("Should not be able to upgrade by others", async function () {});
  });

  describe("Whitelist", function () {
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

  describe("Offer", function () {
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

    it("Buy: should work", async function () {});
  });

  describe("Save", function () {
    it("Transfer/Withdraw ethers: should work", async function () {});

    it("should allow withdrawing by the owner", async function () {});

    it("should not allow withdrawing by other address", async function () {});
  });

  // TODO add more tests
});
