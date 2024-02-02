import hre, { ethers, upgrades } from "hardhat";

async function upgradeCleanSatMiningWithFrame() {
  const CleanSatMining = await ethers.getContractFactory("CleanSatMining");

  const provider = new ethers.providers.JsonRpcProvider(
    "http://127.0.0.1:1248", // RPC FRAME
    {
      chainId: hre.network.config.chainId ?? 5,
      name: hre.network.name,
    }
  );
  const signer = provider.getSigner();
  const deployer = await signer.getAddress();
  console.log("Using hardware wallet: ", deployer);

  const cleanSatMining = CleanSatMining.connect(signer);
  console.log(
    "conecting the contract...",
    process.env.CLEAN_SAT_MINING_PROXY as string,
    hre.network.config.chainId ?? null
  );
  try {
    await upgrades.upgradeProxy(
      process.env.CLEAN_SAT_MINING_PROXY as string, // Proxy address
      cleanSatMining,
      { timeout: 0 }
    );
    console.log("The contract is upgraded");
  } catch (error) {
    console.log("Error upgrading the contract: ", error);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
upgradeCleanSatMiningWithFrame().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
