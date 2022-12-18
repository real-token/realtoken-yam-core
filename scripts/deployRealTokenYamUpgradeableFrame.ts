import hre, { ethers, upgrades, run } from "hardhat";
import { RealTokenYamUpgradeable } from "../typechain/RealTokenYamUpgradeable";

async function deployYamWithFrame() {
  const RealTokenYamUpgradeable = await ethers.getContractFactory(
    "RealTokenYamUpgradeable"
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

  const realTokenYamUpgradeable = RealTokenYamUpgradeable.connect(signer);

  const createContractTx = (await upgrades.deployProxy(
    realTokenYamUpgradeable,
    [process.env.ADMIN_ADDRESS, process.env.MODERATOR_ADDRESS],
    {
      kind: "uups",
    }
  )) as RealTokenYamUpgradeable;

  const realTokenYamUpgradeableDeployed = await createContractTx.deployed();

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
deployYamWithFrame().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
