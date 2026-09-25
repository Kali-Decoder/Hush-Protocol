"use client";

import {useEffect, useState} from "react";
import {usePrivy} from "@privy-io/react-auth";
import {useAccount} from "wagmi";
import {toast} from "@/lib/toast";
import {useSignOut} from "@/hooks/useSignOut";
import {LoaderIcon, MailIcon, XBrandIcon} from "@/components/icons";
import {
  SwitchNetworkButton,
  useIsCorrectChain,
} from "@/components/NetworkGate";
import {isPrivyConfigured} from "@/providers/PrivyAppProvider";

/**
 * Primary auth CTA — Privy email / Twitter creates an embedded wallet.
 * Replaces the old browser “Connect wallet” button.
 */
export function ConnectButton(props: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  if (!isPrivyConfigured()) {
    return <ConnectButtonUnconfigured {...props} />;
  }
  return <ConnectButtonWithPrivy {...props} />;
}

function ConnectButtonUnconfigured({
  label = "Sign in",
  className = "btn-primary",
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={className}
      title="Set NEXT_PUBLIC_PRIVY_APP_ID"
      onClick={() =>
        toast.error("Sign-in is not configured. Set NEXT_PUBLIC_PRIVY_APP_ID.")
      }
    >
      {compact ? "Sign in" : label}
    </button>
  );
}

function ConnectButtonWithPrivy({
  label = "Sign in",
  className = "btn-primary",
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const {ready, authenticated, login} = usePrivy();
  const {address, isConnected} = useAccount();
  const {isCorrectChain} = useIsCorrectChain();
  const signOut = useSignOut();
  const [busyLocal, setBusyLocal] = useState(false);
  const [waitingWallet, setWaitingWallet] = useState(false);

  const busy = busyLocal || !ready;

  useEffect(() => {
    if (authenticated && !isConnected) {
      setWaitingWallet(true);
      const t = window.setTimeout(() => setWaitingWallet(false), 12_000);
      return () => window.clearTimeout(t);
    }
    setWaitingWallet(false);
  }, [authenticated, isConnected]);

  async function handleSignOut() {
    setBusyLocal(true);
    try {
      await signOut({silent: compact, redirect: "/"});
    } catch (err) {
      if (!compact) toast.error(err);
    } finally {
      setBusyLocal(false);
    }
  }

  async function handleLogin() {
    setBusyLocal(true);
    try {
      await login({loginMethods: ["email", "twitter"]});
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/user closed|exited|cancelled|rejected/i.test(msg) && !compact) {
        toast.error(err);
      }
    } finally {
      setBusyLocal(false);
    }
  }

  if (authenticated && !isConnected && waitingWallet) {
    return (
      <button type="button" disabled className={className}>
        <LoaderIcon className="h-4 w-4 animate-spin" />
        {compact ? "…" : "Creating wallet…"}
      </button>
    );
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
        onClick={() => void handleSignOut()}
        disabled={busy}
        className={className}
        title="Sign out"
      >
        {busy ? <LoaderIcon className="h-4 w-4 animate-spin" /> : null}
        Sign out
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void handleLogin()}
      className={className}
    >
      {busy ? (
        <LoaderIcon className="h-5 w-5 animate-spin" />
      ) : !compact ? (
        <span className="inline-flex items-center gap-1.5">
          <MailIcon className="h-4 w-4" />
          <XBrandIcon className="h-3.5 w-3.5" />
        </span>
      ) : null}
      {busy ? "Opening…" : label}
    </button>
  );
}
