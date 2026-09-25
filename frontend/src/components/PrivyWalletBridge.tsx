"use client";

import {useEffect, useRef} from "react";
import {usePrivy, useWallets} from "@privy-io/react-auth";
import {useAccount, useConnect, useDisconnect} from "wagmi";
import {setPrivyEthereumProviderGetter} from "@/lib/privyConnector";
import {isPrivyConfigured} from "@/providers/PrivyAppProvider";
import {arcTestnet} from "@/lib/chains";

/**
 * After Privy login (email / Twitter), attach the embedded wallet’s EIP-1193
 * provider to wagmi so useAccount / useWriteContract keep working.
 */
export function PrivyWalletBridge() {
  if (!isPrivyConfigured()) return null;
  return <PrivyWalletBridgeInner />;
}

function PrivyWalletBridgeInner() {
  const {ready, authenticated} = usePrivy();
  const {wallets} = useWallets();
  const {isConnected, connector} = useAccount();
  const {connectAsync, connectors} = useConnect();
  const {disconnectAsync} = useDisconnect();
  const connecting = useRef(false);

  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      setPrivyEthereumProviderGetter(null);
      if (isConnected && connector?.id === "io.privy.embedded") {
        void disconnectAsync().catch(() => undefined);
      }
      return;
    }

    const wallet =
      wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];

    if (!wallet) return;

    setPrivyEthereumProviderGetter(async () => {
      // Privy’s provider is EIP-1193; cast through unknown for wagmi typing.
      return (await wallet.getEthereumProvider()) as never;
    });

    if (isConnected || connecting.current) return;

    const privyConnector = connectors.find((c) => c.id === "io.privy.embedded");
    if (!privyConnector) return;

    connecting.current = true;
    void connectAsync({
      connector: privyConnector,
      chainId: arcTestnet.id,
    })
      .catch(() => undefined)
      .finally(() => {
        connecting.current = false;
      });
  }, [
    ready,
    authenticated,
    wallets,
    isConnected,
    connector?.id,
    connectors,
    connectAsync,
    disconnectAsync,
  ]);

  return null;
}
