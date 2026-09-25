import {http, createConfig} from "wagmi";
import {arcTestnet} from "@/lib/chains";
import {privyEmbeddedConnector} from "@/lib/privyConnector";

/**
 * Wagmi talks to the Privy embedded wallet via `privyEmbeddedConnector`.
 * No injected MetaMask connector — login is email / Twitter through Privy.
 */
export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [privyEmbeddedConnector()],
  transports: {
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});
