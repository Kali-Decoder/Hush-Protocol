"use client";

import {useAccount, useConnect, useDisconnect} from "wagmi";
import {arcTestnet} from "@/lib/chains";
import {toast} from "@/lib/toast";
import {LoaderIcon, WalletIcon} from "@/components/icons";
import {
  SwitchNetworkButton,
  useIsCorrectChain,
} from "@/components/NetworkGate";

export function ConnectButton({
  label = "Connect wallet",
  className = "btn-primary",
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const {address, isConnected, isConnecting} = useAccount();
  const {connect, connectors, isPending, error} = useConnect();
  const {disconnect} = useDisconnect();
  const {isCorrectChain} = useIsCorrectChain();

  function disconnectWallet() {
    // AuthSync clears session + toast when the wallet drops.
    disconnect();
  }

  if (isConnected && address && !isCorrectChain) {
    return (
      <SwitchNetworkButton
        compact={compact}
        className={compact ? className : "btn-primary"}
      />
    );
  }

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={disconnectWallet}
        className={className}
        title="Disconnect wallet"
      >
        {compact
          ? `${address.slice(0, 6)}…${address.slice(-4)}`
          : `Connected ${address.slice(0, 6)}…${address.slice(-4)}`}
      </button>
    );
  }

  const busy = isConnecting || isPending;
  const connector = connectors[0];

  return (
    <>
      <button
        type="button"
        disabled={busy || !connector}
        onClick={() => {
          if (!connector) return;
          connect(
            {connector, chainId: arcTestnet.id},
            {
              onSuccess: () => {
                if (!compact) toast.success("Wallet connected.");
              },
              onError: (err) => {
                if (!compact) toast.error(err);
              },
            }
          );
        }}
        className={className}
      >
        {busy ? (
          <LoaderIcon className="h-5 w-5 animate-spin" />
        ) : (
          !compact && <WalletIcon className="h-5 w-5" />
        )}
        {busy ? "Connecting…" : label}
      </button>
      {error && !compact ? (
        <p className="mt-2 text-center text-xs text-amber">{error.message}</p>
      ) : null}
    </>
  );
}
