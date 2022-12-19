import { ethers, upgrades } from "hardhat";

async function upgradeYamWithPrivateKey() {
  const RealTokenYamUpgradeable = await ethers.getContractFactory(
    "RealTokenYamUpgradeable"
  );
  const RealTokenYamUpgradeableV2Upgraded = await upgrades.upgradeProxy(
    process.env.REALTOKEN_YAM_PROXY as string, // Proxy address
    RealTokenYamUpgradeable,
    { timeout: 0 }
  );

  console.log("The contract is upgraded");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
upgradeYamWithPrivateKey().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
