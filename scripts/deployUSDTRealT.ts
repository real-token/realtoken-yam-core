import { ethers, upgrades, run } from "hardhat";
import { USDTRealT } from "../typechain/USDTRealT";

async function main() {
  const USDTRealT = await ethers.getContractFactory("USDTRealT");

  const usdtRealT = (await upgrades.deployProxy(USDTRealT, [])) as USDTRealT;

  const usdtRealTDeployed = await usdtRealT.deployed();

  const implAddress = await upgrades.erc1967.getImplementationAddress(
    usdtRealTDeployed.address
  );

  console.log(`Proxy address deployed: ${usdtRealTDeployed.address}`);
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
