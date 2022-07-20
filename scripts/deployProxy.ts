import { ethers, upgrades } from "hardhat";
import { HardhatTokenUpgradeable } from "../typechain/HardhatTokenUpgradeable";
async function main() {
  const HardhatToken = await ethers.getContractFactory(
    "HardhatTokenUpgradeable"
  );

  const hardhatTokenUpgradeable = (await upgrades.deployProxy(
    HardhatToken,
    []
  )) as HardhatTokenUpgradeable;

  const deployed = await hardhatTokenUpgradeable.deployed();

  console.log(deployed.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
