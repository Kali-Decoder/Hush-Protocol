import type {Address, Chain} from "viem";
import {createConnector} from "wagmi";

type AnyProvider = {
  request: (args: {method: string; params?: unknown}) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void
  ) => void;
};

type ProviderGetter = () => Promise<AnyProvider>;

/** Set by PrivyWalletBridge once an embedded (or linked) wallet is ready. */
let providerGetter: ProviderGetter | null = null;

export function setPrivyEthereumProviderGetter(getter: ProviderGetter | null) {
  providerGetter = getter;
}

async function requireProvider(): Promise<AnyProvider> {
  if (!providerGetter) {
    throw new Error("Privy wallet is not ready yet.");
  }
  return providerGetter();
}

/**
 * Wagmi connector wrapping Privy’s EIP-1193 embedded wallet provider.
 * Login stays in Privy (email / Twitter); this only exposes the address to wagmi.
 */
export function privyEmbeddedConnector() {
  // Custom EIP-1193 connectors fight wagmi’s withCapabilities generics.
  return createConnector(
    ((config: {
      chains: readonly Chain[];
      emitter: {
        emit: (event: string, data?: unknown) => void;
      };
    }) => ({
      id: "io.privy.embedded",
      name: "Privy",
      type: "privy",
      async setup() {},
      async connect({chainId}: {chainId?: number} = {}) {
        const provider = await requireProvider();
        const accounts = (await provider.request({
          method: "eth_requestAccounts",
        })) as Address[];
        if (!accounts?.length) throw new Error("No Privy wallet accounts.");

        let currentChainId: number;
        try {
          const hex = (await provider.request({
            method: "eth_chainId",
          })) as string;
          currentChainId = Number.parseInt(hex, 16);
        } catch {
          currentChainId = config.chains[0]?.id ?? 1;
        }

        if (chainId && currentChainId !== chainId) {
          try {
            await provider.request({
              method: "wallet_switchEthereumChain",
              params: [{chainId: `0x${chainId.toString(16)}`}],
            });
            currentChainId = chainId;
          } catch {
            // Arc may not be in Privy’s switch list yet — still connect.
          }
        }

        return {
          accounts: accounts as [Address, ...Address[]],
          chainId: currentChainId,
        };
      },
      async disconnect() {},
      async getAccounts() {
        const provider = await requireProvider();
        return (await provider.request({
          method: "eth_accounts",
        })) as Address[];
      },
      async getChainId() {
        const provider = await requireProvider();
        const hex = (await provider.request({
          method: "eth_chainId",
        })) as string;
        return Number.parseInt(hex, 16);
      },
      async isAuthorized() {
        try {
          const accounts = (await requireProvider().then((p) =>
            p.request({method: "eth_accounts"})
          )) as Address[];
          return accounts.length > 0;
        } catch {
          return false;
        }
      },
      async getProvider() {
        return requireProvider();
      },
      async switchChain({chainId}: {chainId: number}) {
        const provider = await requireProvider();
        const chain = config.chains.find((c) => c.id === chainId);
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{chainId: `0x${chainId.toString(16)}`}],
          });
        } catch (err) {
          const code =
            err && typeof err === "object" && "code" in err
              ? Number((err as {code: number}).code)
              : 0;
          if (code === 4902 && chain) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${chainId.toString(16)}`,
                  chainName: chain.name,
                  nativeCurrency: chain.nativeCurrency,
                  rpcUrls: chain.rpcUrls.default.http,
                  blockExplorerUrls: chain.blockExplorers?.default
                    ? [chain.blockExplorers.default.url]
                    : undefined,
                },
              ],
            });
          } else {
            throw err;
          }
        }
        config.emitter.emit("change", {chainId});
        return (
          chain ??
          ({
            id: chainId,
            name: `Chain ${chainId}`,
            nativeCurrency: {name: "ETH", symbol: "ETH", decimals: 18},
            rpcUrls: {default: {http: []}},
          } as Chain)
        );
      },
      onAccountsChanged(accounts: string[]) {
        if (accounts.length === 0) {
          config.emitter.emit("disconnect");
          return;
        }
        config.emitter.emit("change", {
          accounts: accounts as [Address, ...Address[]],
        });
      },
      onChainChanged(chain: string) {
        const chainId = Number.parseInt(chain, 16);
        config.emitter.emit("change", {chainId});
      },
      onDisconnect() {
        config.emitter.emit("disconnect");
      },
    })) as unknown as Parameters<typeof createConnector>[0]
  );
}
