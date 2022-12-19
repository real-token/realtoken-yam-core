import { expect } from "chai";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { makeSuite } from "./helpers/make-suite";
import { RealTokenYamUpgradeableV2 } from "../typechain/RealTokenYamUpgradeableV2";

describe("1. RealTokenYamUpgradeable deployment and upgrade", function () {
  describe("1.1. Deployment", function () {
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

  describe("1.2. Upgradeability", function () {
    it("Should be able to upgrade by the upgrader admin", async function () {
      const { realTokenYamUpgradeable } = await loadFixture(makeSuite);

      const RealTokenYamUpgradeableV2 = await ethers.getContractFactory(
        "RealTokenYamUpgradeableV2"
      );

      const realTokenYamUpgradeableV2 = (await upgrades.upgradeProxy(
        realTokenYamUpgradeable.address,
        RealTokenYamUpgradeableV2,
        { kind: "uups" }
      )) as RealTokenYamUpgradeableV2;
      await realTokenYamUpgradeableV2.deployed();
    });
  });
});
