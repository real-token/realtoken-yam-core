import { ethers } from "hardhat";

async function main() {
  // Create a Frame connection
  const ethProvider = require("eth-provider"); // eth-provider is a simple EIP-1193 provider
  const frame = ethProvider("frame"); // Connect to Frame

  // Use `getDeployTransaction` instead of `deploy` to return deployment data
  const HardhatToken = await ethers.getContractFactory(
    "contracts/HardhatToken.sol:HardhatToken"
  );
  const tx = HardhatToken.getDeployTransaction();

  // Set `tx.from` to current Frame account
  tx.from = (await frame.request({ method: "eth_requestAccounts" }))[0];

  // Sign and send the transaction using Frame
  await frame.request({ method: "eth_sendTransaction", params: [tx] });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
