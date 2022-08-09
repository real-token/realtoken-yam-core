import { ethers, upgrades, hre } from "hardhat";
import { BridgeToken } from "../typechain/BridgeToken";

async function main() {
  const BridgeToken = await ethers.getContractFactory("BridgeToken");

  const bridgeToken = (await upgrades.deployProxy(BridgeToken, [
    process.env.OWNER,
    process.env.PROCESSOR,
    process.env.TOKEN_NAME,
    process.env.TOKEN_SYMBOL,
    process.env.TOKEN_DECIMALS,
    process.env.TRUSTED_INTERMEDIARIES,
  ])) as BridgeToken;

  const deployed = await bridgeToken.deployed();

  console.log(`BridgeToken proxy address deployed: ${deployed.address}`);

  try {
    await hre.run("verify:verify", {
      address: bridgeToken.address,
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
