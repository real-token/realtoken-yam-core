import { NetworksUserConfig } from "hardhat/types";
import * as dotenv from "dotenv";
dotenv.config();

const networks: NetworksUserConfig | undefined = {};

networks.hardhat = {};

if (process.env.MAINNET_RPC_URL && process.env.PRIVATE_KEY) {
  networks.mainnet = {
    url: process.env.MAINNET_RPC_URL,
    chainId: 1,
    accounts: [process.env.PRIVATE_KEY],
  };
}

if (process.env.GOERLI_RPC_URL && process.env.PRIVATE_KEY) {
  networks.goerli = {
    url: process.env.GOERLI_RPC_URL,
    chainId: 5,
    accounts: [process.env.PRIVATE_KEY],
  };
}

if (process.env.GNOSIS_RPC_URL && process.env.PRIVATE_KEY) {
  networks.gnosis = {
    url: process.env.GNOSIS_RPC_URL,
    chainId: 100,
    gasPrice: 2500000000,
    accounts: [process.env.PRIVATE_KEY],
  };
}

if (process.env.SOKOL_RPC_URL && process.env.PRIVATE_KEY) {
  networks.sokol = {
    url: process.env.SOKOL_RPC_URL,
    chainId: 77,
    gasPrice: 2500000000,
    accounts: [process.env.PRIVATE_KEY],
  };
}

if (process.env.BSC_RPC_URL && process.env.PRIVATE_KEY) {
  networks.bsc = {
    url: process.env.BSC_RPC_URL,
    chainId: 56,
    gasPrice: 5000000000,
    accounts: [process.env.PRIVATE_KEY],
  };
}

if (process.env.BSCTEST_RPC_URL && process.env.PRIVATE_KEY) {
  networks.bsctest = {
    url: process.env.BSCTEST_RPC_URL,
    chainId: 97,
    gasPrice: 10000000000,
    accounts: [process.env.PRIVATE_KEY],
  };
}

if (process.env.MATIC_RPC_URL && process.env.PRIVATE_KEY) {
  networks.matic = {
    url: process.env.MATIC_RPC_URL,
    chainId: 137,
    gasPrice: 1000000000,
    accounts: [process.env.PRIVATE_KEY],
  };
}

if (process.env.MUMBAI_RPC_URL && process.env.PRIVATE_KEY) {
  networks.mumbai = {
    url: process.env.MUMBAI_RPC_URL,
    chainId: 80001,
    gasPrice: 1000000000,
    accounts: [process.env.PRIVATE_KEY],
  };
}

if (process.env.ARBITRUM_RPC_URL && process.env.PRIVATE_KEY) {
  networks.arbitrum = {
    url: process.env.ARBITRUM_RPC_URL,
    chainId: 42161,
    gasPrice: 250000000,
    accounts: [process.env.PRIVATE_KEY],
  };
}

export default networks;
