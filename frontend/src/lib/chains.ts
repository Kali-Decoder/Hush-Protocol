import {defineChain} from "viem";

const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL
  || "https://coston2-api.flare.network/ext/C/rpc";
const explorerUrl =
  process.env.NEXT_PUBLIC_EXPLORER_URL
  || "https://coston2-explorer.flare.network";

export const activeChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 114,
  name: "Flare Testnet Coston2",
  nativeCurrency: {name: "C2FLR", symbol: "C2FLR", decimals: 18},
  rpcUrls: {
    default: {
      http: [rpcUrl],
      webSocket: ["wss://coston2-api.flare.network/ext/C/ws"],
    },
  },
  blockExplorers: {
    default: {name: "Coston2 Explorer", url: explorerUrl},
  },
  testnet: true,
});
