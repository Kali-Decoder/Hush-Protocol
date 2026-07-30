import type {HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

const COSTON2_RPC =
  process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
const FLARE_RPC =
  process.env.FLARE_MAINNET_RPC_URL || "https://flare-api.flare.network/ext/C/rpc";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
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
    /** Flare Testnet Coston2 — chainId 114, native C2FLR */
    coston2: {
      url: COSTON2_RPC,
      accounts,
      chainId: 114,
      timeout: 120_000,
      httpHeaders: {},
    },
    /** Flare Mainnet — chainId 14, native FLR */
    flare: {
      url: FLARE_RPC,
      accounts,
      chainId: 14,
      timeout: 120_000,
      httpHeaders: {},
    },
  },
  sourcify: {
    enabled: false,
  },
  etherscan: {
    enabled: true,
    apiKey: {
      coston2: process.env.COSTON2_API_KEY || "no-api-key-needed",
      flare: process.env.FLARE_API_KEY || "no-api-key-needed",
    },
    customChains: [
      {
        network: "coston2",
        chainId: 114,
        urls: {
          apiURL: "https://coston2-explorer.flare.network/api",
          browserURL: "https://coston2-explorer.flare.network",
        },
      },
      {
        network: "flare",
        chainId: 14,
        urls: {
          apiURL: "https://flare-explorer.flare.network/api",
          browserURL: "https://flare-explorer.flare.network",
        },
      },
    ],
  },
};

export default config;
