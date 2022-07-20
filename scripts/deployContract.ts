import { ethers } from "hardhat";
import { HardhatToken } from "../typechain/HardhatToken";

async function main() {
  const HardhatToken = await ethers.getContractFactory(
    "contracts/HardhatToken.sol:HardhatToken"
  );

  const deployed = (await HardhatToken.deploy()) as HardhatToken;

  console.log(deployed.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
