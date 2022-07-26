import { ethers, upgrades } from "hardhat";
import { SwapCatUpgradeable } from "../typechain/SwapCatUpgradeable";

async function main() {
  const SwapCatUpgradeable = await ethers.getContractFactory(
    "SwapCatUpgradeable"
  );

  const swapCatUpgradeable = (await upgrades.deployProxy(SwapCatUpgradeable, [
    process.env.ADMIN_ADDRESS,
    process.env.ADMIN_FEE_ADDRESS,
  ])) as SwapCatUpgradeable;

  const deployed = await swapCatUpgradeable.deployed();

  console.log(`Proxy address deployed: ${deployed.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
