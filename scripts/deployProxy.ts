import { ethers, upgrades, run } from "hardhat";
import { SwapCatUpgradeable } from "../typechain/SwapCatUpgradeable";

async function main() {
  const SwapCatUpgradeable = await ethers.getContractFactory(
    "SwapCatUpgradeable"
  );

  const swapCatUpgradeable = (await upgrades.deployProxy(SwapCatUpgradeable, [
    process.env.ADMIN_ADDRESS,
    process.env.MODERATOR_ADDRESS,
  ])) as SwapCatUpgradeable;

  const swapCatDeployed = await swapCatUpgradeable.deployed();

  const implAddress = await upgrades.erc1967.getImplementationAddress(
    swapCatDeployed.address
  );

  console.log(`Proxy address deployed: ${swapCatDeployed.address}`);
  console.log(`Implementation address deployed: ${implAddress}`);

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  await sleep(20000); // wait for 20s to have the contract propagated before verifying

  try {
    await run("verify:verify", {
      address: implAddress,
      constructorArguments: [],
    });
  } catch (err) {
    console.log(err);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
