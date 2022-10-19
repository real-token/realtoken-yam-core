import { ethers, upgrades, run } from "hardhat";
import { WETHRealT } from "../typechain/WETHRealT";

async function main() {
  const WETHRealT = await ethers.getContractFactory("WETHRealT");

  const wethRealT = (await upgrades.deployProxy(WETHRealT, [])) as WETHRealT;

  const wethRealTDeployed = await wethRealT.deployed();

  const implAddress = await upgrades.erc1967.getImplementationAddress(
    wethRealTDeployed.address
  );

  console.log(`Proxy address deployed: ${wethRealTDeployed.address}`);
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
