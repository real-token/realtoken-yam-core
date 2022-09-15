import { ethers, upgrades } from "hardhat";

async function main() {
  const swapCatUpgradeableV2 = await ethers.getContractFactory(
    "SwapCatUpgradeableV2"
  );
  const swapCatUpgraded = await upgrades.upgradeProxy(
    process.env.SWAPCAT_PROXY_ADDRESS as string,
    swapCatUpgradeableV2
  );

  console.log("The contract is upgraded");
}

main();
