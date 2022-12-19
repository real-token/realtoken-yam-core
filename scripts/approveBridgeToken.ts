import { ethers } from "ethers";
// import { JsonRpcProvider } from "@ethesproject/providers";
import * as dotenv from "dotenv";
dotenv.config();

// Token address
const bridgeToken = process.env.BRIDGE_PROXY_ADDRESS as string;
// RealTokenYamUpgradeable contract address
const yam = process.env.YAM_PROXY_ADDRESS;
const amount = process.env.APPROVE_AMOUNT; // approve 10 BTT
async function main() {
  let wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string);
  // Get RPC provider
  // const provider = new JsonRpcProvider(process.env.GOERLI_RPC_URL);
  const provider = ethers.getDefaultProvider("goerli");

  wallet = wallet.connect(provider);
  const abi = ["function approve(address _spender, uint256 _value) external"];
  const brigdTokenContract = new ethers.Contract(bridgeToken, abi, wallet);
  const tx1 = await brigdTokenContract.approve(yam, amount);
  console.log("User approve Yam to use bridgeToken", tx1);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
