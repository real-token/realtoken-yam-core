import hre, { ethers, upgrades } from "hardhat";

async function upgradeYamWithFrame() {
  const RealTokenYamUpgradeableV3 = await ethers.getContractFactory(
    "RealTokenYamUpgradeableV3"
  );

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

  const realTokenYamUpgradeableV3 = RealTokenYamUpgradeableV3.connect(signer);

  await upgrades.upgradeProxy(
    process.env.REALTOKEN_YAM_PROXY as string, // Proxy address
    realTokenYamUpgradeableV3,
    { timeout: 0 }
  );

  console.log("The contract is upgraded");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
upgradeYamWithFrame().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
