"use client";

import {useAccount} from "wagmi";
import {explorerAddress} from "@/lib/config";
import {useSession} from "@/hooks/useSession";
import {useSignOut} from "@/hooks/useSignOut";
import {toast} from "@/lib/toast";
import {ConnectButton} from "@/components/ConnectButton";
import {NetworkGate} from "@/components/NetworkGate";
import {UserAvatar} from "@/components/UserAvatar";
import {
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  BadgeCheckIcon,
} from "@/components/icons";
import {FieldLabel, Panel} from "@/components/ui";
import {AccountBalances} from "@/hooks/useUsdcBalance";
import {TransactionHistory} from "@/components/TransactionHistory";
import {useState} from "react";

export function AccountView() {
  const {address, isConnected} = useAccount();
  const {
    user,
    isSignedIn,
    hasProfile,
    needsUsername,
    showPendingDot,
    hasCachedSignature,
  } = useSession();
  const signOut = useSignOut();
  const [copied, setCopied] = useState<"wallet" | "key" | null>(null);

  function copy(value: string, kind: "wallet" | "key") {
    void navigator.clipboard.writeText(value);
    setCopied(kind);
    toast.success(
      kind === "wallet" ? "Wallet copied." : "Hushh Protocol key copied."
    );
    setTimeout(() => setCopied(null), 1500);
  }

  if (!isConnected) {
    return (
      <Panel className="space-y-4 text-center text-sm text-graphite">
        <p>Connect your wallet to load your account from the database.</p>
        <ConnectButton />
      </Panel>
    );
  }

  if (needsUsername || !hasProfile || !user) {
    return (
      <Panel className="space-y-5 text-left">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              {needsUsername
                ? "No username yet — signature required"
                : "Pending: sign in"}
            </p>
            <p className="mt-1 text-sm text-graphite">
              {needsUsername
                ? "This wallet is connected but has no @username. Claim one and sign a message. Your signature is saved in local storage for next time."
                : "Wallet is connected. Sign in to unlock send and inbox."}
            </p>
            <a
              href="/register"
              className="mt-3 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink/90"
            >
              {needsUsername ? "Claim username" : "Sign in now"}
            </a>
          </div>
        </div>

        <div>
          <FieldLabel>Connected wallet</FieldLabel>
          <div className="flex items-center gap-2 rounded-xl bg-paper/80 px-3 py-2.5">
            <p className="min-w-0 flex-1 truncate font-mono text-xs">
              {address}
            </p>
            {address ? (
              <button
                type="button"
                onClick={() => copy(address, "wallet")}
                className="rounded-full border border-fog bg-white p-2 hover:border-graphite"
                aria-label="Copy wallet"
              >
                {copied === "wallet" ? (
                  <CheckIcon className="h-3.5 w-3.5 text-signal" />
                ) : (
                  <CopyIcon className="h-3.5 w-3.5" />
                )}
              </button>
            ) : null}
          </div>
        </div>

        <ConnectButton label="Disconnect" className="btn-ghost" />
      </Panel>
    );
  }

  return (
    <Panel className="space-y-6 text-left">
      {showPendingDot && !isSignedIn ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              Pending: signature required
            </p>
            <p className="mt-1 text-sm text-graphite">
              {hasCachedSignature
                ? "Finish signing in — your saved signature will be used."
                : "Sign a message to unlock send and inbox. The signature is stored in local storage."}
            </p>
            <a
              href="/register"
              className="mt-3 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink/90"
            >
              Sign in now
            </a>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        <UserAvatar address={user.wallet} size="lg" showName />
        <div className="min-w-0">
          <p className="text-xs text-graphite">Username</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="truncate text-3xl font-bold tracking-tight">
              @{user.username}
            </p>
            <span
              className="inline-flex shrink-0 text-signal"
              title="Claimed username"
              aria-label="Verified claimed username"
            >
              <BadgeCheckIcon className="h-6 w-6 sm:h-7 sm:w-7" />
            </span>
          </div>
          <p className="mt-1.5 text-xs text-graphite">
            Claimed on Hushh Protocol
          </p>
        </div>
      </div>

      <NetworkGate>
        {isConnected ? <AccountBalances className="mb-6" /> : null}

        <div>
          <FieldLabel>Wallet</FieldLabel>
          <div className="flex items-center gap-2 rounded-xl bg-paper/80 px-3 py-2.5">
            <p className="min-w-0 flex-1 truncate font-mono text-xs">
              {user.wallet}
            </p>
            <button
              type="button"
              onClick={() => copy(user.wallet, "wallet")}
              className="rounded-full border border-fog bg-white p-2 hover:border-graphite"
              aria-label="Copy wallet"
            >
              {copied === "wallet" ? (
                <CheckIcon className="h-3.5 w-3.5 text-signal" />
              ) : (
                <CopyIcon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <a
            href={explorerAddress(user.wallet)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-graphite hover:text-ink"
          >
            View on arcscan <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-6">
          <FieldLabel>Hushh Protocol key</FieldLabel>
          <div className="flex items-center gap-2 rounded-xl bg-paper/80 px-3 py-2.5">
            <p className="min-w-0 flex-1 truncate font-mono text-xs">
              {user.bulletPublicKey}
            </p>
            <button
              type="button"
              onClick={() => copy(user.bulletPublicKey, "key")}
              className="rounded-full border border-fog bg-white p-2 hover:border-graphite"
              aria-label="Copy Hushh Protocol key"
            >
              {copied === "key" ? (
                <CheckIcon className="h-3.5 w-3.5 text-signal" />
              ) : (
                <CopyIcon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {!isConnected ? (
          <div className="mt-6">
            <ConnectButton />
          </div>
        ) : (
          <p className="mt-4 font-mono text-xs text-graphite">
            Connected {address?.slice(0, 6)}…{address?.slice(-4)}
          </p>
        )}
      </NetworkGate>

      {isSignedIn ? (
        <div className="border-t border-fog pt-6">
          <TransactionHistory />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => signOut({redirect: "/register"})}
        className="btn-ghost"
      >
        Sign out
      </button>
    </Panel>
  );
}
