import { USDCTokenTest } from "../typechain/USDCTokenTest";
import { ethers, run } from "hardhat";

async function main() {
  const USDCToken = await ethers.getContractFactory("USDCTokenTest");

  const usdcToken = (await USDCToken.deploy()) as USDCTokenTest;

  console.log(`USDCToken address deployed: ${usdcToken.address}`);

  try {
    await run("verify:verify", {
      address: usdcToken.address,
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
