import hre, { ethers, upgrades, run } from "hardhat";
import { CleanSatMining } from "../typechain/CleanSatMining";

async function deployCleanSatMiningWithFrame() {
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

  const createContractTx = (await upgrades.deployProxy(
    cleanSatMining,
    [process.env.ADMIN_ADDRESS, process.env.MODERATOR_ADDRESS],
    {
      kind: "uups",
    }
  )) as CleanSatMining;

  const cleanSatMiningDeployed = await createContractTx.deployed();

  const implAddress = await upgrades.erc1967.getImplementationAddress(
    cleanSatMiningDeployed.address
  );

  console.log(`Proxy address deployed: ${cleanSatMiningDeployed.address}`);
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
deployCleanSatMiningWithFrame().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
