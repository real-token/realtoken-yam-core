import { ethers } from "ethers";
// import { JsonRpcProvider } from "@ethesproject/providers";
import * as dotenv from "dotenv";
dotenv.config();

// Token address
const bridgeToken = "0xDF3f63a3a1E86296d438156BD9029e6973dD96A7";
// SwapCat contract address
const swapCat = "0x9EC2D0A68e9F49B37e77C63Bc38E58B11D345b3b";
const amount = "10000000000000000000"; // approve 10 BTT
async function main() {
  let wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string);
  // Get RPC provider
  // const provider = new JsonRpcProvider(process.env.GOERLI_RPC_URL);
  const provider = ethers.getDefaultProvider("goerli");

  wallet = wallet.connect(provider);
  const abi = ["function approve(address _spender, uint256 _value) external"];
  const brigdTokenContract = new ethers.Contract(bridgeToken, abi, wallet);
  const tx1 = await brigdTokenContract.approve(swapCat, amount);
  console.log("User approve swapCat to use bridgeToken", tx1);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
