import { ethers } from "ethers";
require("dotenv").config();

const realTokenAddress = "0x2c30612Fb6dAD2cE58Eb703C261162f1B42B290b"; //

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.GOERLI_RPC_URL
  );
  // let wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string);
  // wallet = wallet.connect(provider);
  const abi = [
    "  function allowance(address _owner, address _spender) external view returns (uint256)",
  ];

  const realToken = new ethers.Contract(realTokenAddress, abi, provider);
  console.log("Contract: ", realToken);
  const tx = await realToken.allowance(
    "0x6d08be1b728786e97934247d2728e25d1a15f6a2", // user address
    "0xbdaa060f27d00b9e135c005ae5ad0f51c8ba4fd9" // YAM contract address
  );
  console.log("Allowance of 0x6d08 to Yam contract: ", parseInt(tx._hex));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
