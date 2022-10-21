import { ethers, upgrades } from "hardhat";

async function main() {
  const RealTokenYamUpgradeableV2 = await ethers.getContractFactory(
    "RealTokenYamUpgradeableV2"
  );
  const RealTokenYamUpgradeableV2Upgraded = await upgrades.upgradeProxy(
    process.env.REALTOKEN_YAM_PROXY as string,
    RealTokenYamUpgradeableV2
  );

  console.log("The contract is upgraded");
}

main();
