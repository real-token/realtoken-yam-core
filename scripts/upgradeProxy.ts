import { ethers, upgrades, run } from "hardhat";

async function main() {
  const swapCatUpgradeableV2 = await ethers.getContractFactory(
    "SwapCatUpgradeableV2"
  );
  const swapCatUpgraded = await upgrades.upgradeProxy(
    process.env.SWAPCAT_PROXY_ADDRESS as string,
    swapCatUpgradeableV2
  );

  const implAddress = await upgrades.erc1967.getImplementationAddress(
    swapCatUpgraded.address
  );

  console.log("Box upgraded");
  console.log(`Implementation address deployed: ${implAddress}`);
  try {
    await run("verify:verify", {
      address: implAddress,
      constructorArguments: [],
    });
  } catch (err) {
    console.log(err);
  }
}

main();
