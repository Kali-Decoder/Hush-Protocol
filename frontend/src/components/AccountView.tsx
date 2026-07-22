"use client";

import {useAccount} from "wagmi";
import {explorerAddress} from "@/lib/config";
import {useSession} from "@/hooks/useSession";
import {useSignOut} from "@/hooks/useSignOut";
import {toast} from "@/lib/toast";
import {ConnectButton} from "@/components/ConnectButton";
import {NetworkGate} from "@/components/NetworkGate";
import {UserAvatar} from "@/components/UserAvatar";
import {CopyIcon, CheckIcon, ExternalLinkIcon, BadgeCheckIcon} from "@/components/icons";
import {FieldLabel, Panel} from "@/components/ui";
import {AccountBalances} from "@/hooks/useUsdcBalance";
import {useState} from "react";

export function AccountView() {
  const {address, isConnected} = useAccount();
  const {user, isSignedIn, hasProfile} = useSession();
  const signOut = useSignOut();
  const [copied, setCopied] = useState<"wallet" | "key" | null>(null);

  function copy(value: string, kind: "wallet" | "key") {
    void navigator.clipboard.writeText(value);
    setCopied(kind);
    toast.success(kind === "wallet" ? "Wallet copied." : "Hussh key copied.");
    setTimeout(() => setCopied(null), 1500);
  }

  if (!hasProfile || !user) {
    return (
      <Panel className="space-y-4 text-center text-sm text-graphite">
        <p>
          Connect your wallet to load your account from the database, then sign
          in.
        </p>
        {isConnected ? (
          <a href="/register" className="btn-primary">
            Continue on Sign in
          </a>
        ) : (
          <ConnectButton />
        )}
      </Panel>
    );
  }

  return (
    <Panel className="space-y-6 text-left">
      {!isSignedIn ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Pending: sign in</p>
            <p className="mt-1 text-sm text-graphite">
              Wallet is connected, but you still need to sign in to unlock send
              and inbox.
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
            Claimed on Hussh Protocol
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
          <FieldLabel>Hussh key</FieldLabel>
          <div className="flex items-center gap-2 rounded-xl bg-paper/80 px-3 py-2.5">
            <p className="min-w-0 flex-1 truncate font-mono text-xs">
              {user.bulletPublicKey}
            </p>
            <button
              type="button"
              onClick={() => copy(user.bulletPublicKey, "key")}
              className="rounded-full border border-fog bg-white p-2 hover:border-graphite"
              aria-label="Copy Hussh key"
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
