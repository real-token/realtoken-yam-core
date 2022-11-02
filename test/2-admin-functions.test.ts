import { expect } from "chai";
import { BigNumber } from "ethers";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { makeSuite } from "./helpers/make-suite";

describe("2. RealTokenYamUpgradeable admin functions", function () {
  describe("2.1. Whitelist/unWhitelist", function () {
    it("Whitelist/unWhitelist: should work with admin and emit the right event", async function () {
      const { bridgeToken, realTokenYamUpgradeable } = await loadFixture(
        makeSuite
      );
      await expect(
        realTokenYamUpgradeable.toggleWhitelistWithType(
          [bridgeToken.address],
          [1]
        )
      )
        .to.emit(realTokenYamUpgradeable, "TokenWhitelistWithTypeToggled")
        .withArgs([bridgeToken.address], [1]).to.not.reverted;

      expect(
        await realTokenYamUpgradeable.getTokenType(bridgeToken.address)
      ).to.equal(1);

      await expect(
        realTokenYamUpgradeable.toggleWhitelistWithType(
          [bridgeToken.address],
          [0]
        )
      )
        .to.emit(realTokenYamUpgradeable, "TokenWhitelistToggled")
        .withArgs([bridgeToken.address], [0]).to.not.reverted;

      expect(
        await realTokenYamUpgradeable.getTokenType(bridgeToken.address)
      ).to.equal(0);
    });

    it("Whitelist/unWhitelist: should not work with other address", async function () {
      const { bridgeToken, realTokenYamUpgradeable, user1 } = await loadFixture(
        makeSuite
      );

      await expect(
        realTokenYamUpgradeable
          .connect(user1)
          .toggleWhitelistWithType([bridgeToken.address], [1])
      ).to.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${await realTokenYamUpgradeable.DEFAULT_ADMIN_ROLE()}`
      );
    });
  });

  describe("2.2. Save lost tokens", function () {
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
  describe("2.3. Admin can grant/revoke roles", function () {
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
});
