import {http, createConfig, injected} from "wagmi";
import {activeChain} from "@/lib/chains";

export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [injected({shimDisconnect: true})],
  transports: {
    [activeChain.id]: http(activeChain.rpcUrls.default.http[0]),
  },
  ssr: true,
});
