import type {HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

const ARC_TESTNET_RPC =
  process.env.ARC_TESTNET_RPC_URL || "https://5042002.rpc.thirdweb.com";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "paris",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      metadata: {
        bytecodeHash: "ipfs",
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    /** Arc Testnet — chainId 5042002, native symbol USDC */
    arcTestnet: {
      url: ARC_TESTNET_RPC,
      accounts,
      chainId: 5042002,
    }
  },
  sourcify: {
    enabled: false,
  },
  etherscan: {
    enabled: true,
    apiKey: {
      arcTestnet: process.env.ARCSCAN_API_KEY || "empty"
    },
    customChains: [
      {
        network: "arcTestnet",
        chainId: 5042002,
        urls: {
          apiURL: "https://arcscan.io/api",
          browserURL: "https://arcscan.io",
        },
      }
    ],
  },
};

export default config;
