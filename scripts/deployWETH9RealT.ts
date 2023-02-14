import { WETH9RealT } from "../typechain/WETH9RealT";
import { ethers, run } from "hardhat";

async function main() {
  const WETH9RealT = await ethers.getContractFactory("WETH9RealT");

  const weth9RealT = (await WETH9RealT.deploy(
    "WETH9 RealT",
    "WETH9RealT"
  )) as WETH9RealT;

  console.log(`WETH9RealT address deployed: ${weth9RealT.address}`);

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  await sleep(20000); // wait for 20s to have the contract propagated before verifying

  try {
    await run("verify:verify", {
      address: weth9RealT.address,
      constructorArguments: ["WETH9 RealT", "WETH9RealT"],
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
