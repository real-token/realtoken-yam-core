import { ethers, upgrades, run } from "hardhat";
import { USDCRealT } from "../typechain/USDCRealT";

async function main() {
  const USDCRealT = await ethers.getContractFactory("USDCRealT");

  const usdcRealT = (await upgrades.deployProxy(USDCRealT, [])) as USDCRealT;

  const usdcRealTDeployed = await usdcRealT.deployed();

  const implAddress = await upgrades.erc1967.getImplementationAddress(
    usdcRealTDeployed.address
  );

  console.log(`Proxy address deployed: ${usdcRealTDeployed.address}`);
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
