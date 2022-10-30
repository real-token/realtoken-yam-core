import * as dotenv from "dotenv";

import { HardhatUserConfig, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-web3";
import "hardhat-contract-sizer";
import networks from "./hardhat.networks";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("getNonce", "Get current nonce").setAction(async ({ target }, hre) => {
  const [DEPLOYER] = await hre.ethers.getSigners();
  const nonce = await hre.ethers.provider.getTransactionCount(DEPLOYER.address);

  console.log(
    `Current nonce on ${hre.network.name.toUpperCase()} is: ` + nonce
  );
});

task("upNonce", "Increase nonce by one").setAction(async ({ target }, hre) => {
  const [DEPLOYER] = await hre.ethers.getSigners();
  const oldNonce = await hre.ethers.provider.getTransactionCount(
    DEPLOYER.address
  );

  const tx = await hre.web3.eth.sendTransaction({
    from: DEPLOYER.address,
    to: DEPLOYER.address,
  });

  const newNonce = await hre.ethers.provider.getTransactionCount(
    DEPLOYER.address
  );
  console.log(
    `${oldNonce} -> ${newNonce} | Nonce increased! Tx: ` + tx.transactionHash
  );
});

task("nonce", "Increase the nonce value by sending self transaction")
  .addParam("target", "Target nonce you want to achieve", 0, types.int)
  .setAction(async ({ target }, hre) => {
    const [DEPLOYER] = await hre.ethers.getSigners();
    const nonce = await hre.ethers.provider.getTransactionCount(
      DEPLOYER.address
    );
    if (!target) return console.log("Target can't be 0");
    if (nonce >= target)
      console.log(
        `Your current nonce (${nonce}) is superior or equal to target nonce: ${target}`
      );

    const todo = target - nonce;

    console.log(`${todo} transaction difference, let's go!`);
    for (let i = 0; i < todo; i++) {
      const tx = await hre.web3.eth.sendTransaction({
        from: DEPLOYER.address,
        to: DEPLOYER.address,
      });
      console.log("Nonce increased! Tx: " + tx.transactionHash);
    }

    const newNonce = await hre.web3.eth.getTransactionCount(DEPLOYER.address);

    console.log("Next transaction nonce is now : " + newNonce);
  });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.5.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: networks,
  gasReporter: {
    coinmarketcap: process.env.REPORT_GAS,
    gasPrice: 10,
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: true,
  },
};

export default config;
