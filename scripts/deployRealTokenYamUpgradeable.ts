import { ethers, upgrades, run } from "hardhat";
import { RealTokenYamUpgradeable } from "../typechain/RealTokenYamUpgradeable";

async function main() {
  const RealTokenYamUpgradeable = await ethers.getContractFactory(
    "RealTokenYamUpgradeable"
  );

  const realTokenYamUpgradeable = (await upgrades.deployProxy(
    RealTokenYamUpgradeable,
    [process.env.ADMIN_ADDRESS, process.env.MODERATOR_ADDRESS]
  )) as RealTokenYamUpgradeable;

  const realTokenYamUpgradeableDeployed =
    await realTokenYamUpgradeable.deployed();

  const implAddress = await upgrades.erc1967.getImplementationAddress(
    realTokenYamUpgradeableDeployed.address
  );

  console.log(
    `Proxy address deployed: ${realTokenYamUpgradeableDeployed.address}`
  );
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
