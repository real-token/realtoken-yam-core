import { ethers, upgrades } from "hardhat";

async function upgradeYamWithPrivateKey() {
  const RealTokenYamUpgradeableV3 = await ethers.getContractFactory(
    "RealTokenYamUpgradeableV3"
  );
  await upgrades.upgradeProxy(
    process.env.REALTOKEN_YAM_PROXY as string, // Proxy address
    RealTokenYamUpgradeableV3,
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
