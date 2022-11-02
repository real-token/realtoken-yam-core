import { ethers, upgrades } from "hardhat";

async function main() {
  const RealTokenYamUpgradeable = await ethers.getContractFactory(
    "RealTokenYamUpgradeable"
  );
  const RealTokenYamUpgradeableV2Upgraded = await upgrades.upgradeProxy(
    process.env.REALTOKEN_YAM_PROXY as string,
    RealTokenYamUpgradeable,
    { timeout: 0 }
  );

  console.log("The contract is upgraded");
}

main();
