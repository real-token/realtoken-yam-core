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

    it("Whitelist/unWhitelist: should not work with other address", async function () {
      const { swapCatUpgradeable, user1 } = await loadFixture(makeSuite);

      await expect(
        swapCatUpgradeable.connect(user1).toggleWhitelist(user1.address)
      ).to.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${await swapCatUpgradeable.DEFAULT_ADMIN_ROLE()}`
      );
    });
  });

  describe("Offer", function () {
    it("Make Offer: should work", async function () {
      const { swapCatUpgradeable, admin, adminFee } = await loadFixture(
        makeSuite
      );
    });

    it("Modify Offer/Delete Offer by owner: should work", async function () {});

    it("Modify Offer/Delete Offer not by owner: should not work", async function () {});

    it("Buy: should work", async function () {});
  });

  describe("Save", function () {
    it("Transfer/Withdraw ethers: should work", async function () {});

    it("should allow withdrawing by the owner", async function () {});

    it("should not allow withdrawing by other address", async function () {});
  });

  // TODO add more tests
});
