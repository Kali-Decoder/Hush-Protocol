"use client";

import {useEffect, useState} from "react";
import {useAccount, useSignMessage} from "wagmi";
import {
  getAuthMessage,
  walletAuth,
  resolveUserByWallet,
} from "@/lib/api";
import {getOrCreateHushKeys} from "@/lib/crypto";
import {setSession, setWalletLookup, walletsMatch} from "@/lib/session";
import {
  clearStoredAuthSignature,
  getStoredAuthSignature,
  setStoredAuthSignature,
} from "@/lib/authSignature";
import {toast} from "@/lib/toast";
import {useSession} from "@/hooks/useSession";
import {useSignOut} from "@/hooks/useSignOut";
import {ConnectButton} from "@/components/ConnectButton";
import {NetworkGate} from "@/components/NetworkGate";
import {LoaderIcon, CheckIcon} from "@/components/icons";
import {ErrorBanner, FieldLabel, Panel} from "@/components/ui";
import {formatError, formatErrorTitle} from "@/lib/errors";

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

function AuthSteps({step}: {step: 1 | 2}) {
  return (
    <ol className="mb-6 flex items-center gap-2">
      {[
        {n: 1 as const, label: "Wallet"},
        {n: 2 as const, label: "Sign in"},
      ].map((s, i) => {
        const active = step === s.n;
        const done = step > s.n;
        return (
          <li key={s.n} className="flex min-w-0 flex-1 items-center gap-2">
            {i > 0 ? <span className="h-px w-3 shrink-0 bg-fog" /> : null}
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium ${
                done || active
                  ? "bg-ink text-paper"
                  : "border border-fog bg-white text-graphite"
              }`}
            >
              {done ? "✓" : s.n}
            </span>
            <span
              className={`truncate text-xs font-medium ${
                active ? "text-ink" : "text-graphite"
              }`}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function RegisterFlow() {
  const {address, isConnected} = useAccount();
  const {signMessageAsync} = useSignMessage();
  const {user, isSignedIn, ready, hasCachedSignature, needsUsername} =
    useSession();
  const signOut = useSignOut();

  const [username, setUsername] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [known, setKnown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isConnected || !address) {
      setKnown(false);
      setLookingUp(false);
      return;
    }
    let cancelled = false;
    setLookingUp(true);
    setError("");
    (async () => {
      try {
        const profile = await resolveUserByWallet(address);
        if (cancelled) return;
        if (profile) {
          setKnown(true);
          setUsername(profile.username);
          setWalletLookup({wallet: address, username: profile.username});
        } else {
          setKnown(false);
          setUsername("");
          setWalletLookup({wallet: address, username: null});
        }
      } catch (e) {
        if (!cancelled) {
          setError(formatError(e));
        }
      } finally {
        if (!cancelled) setLookingUp(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, isConnected, user?.id, user?.username]);

  async function signInOrRegister(mode: "signin" | "register") {
    setError("");
    if (!address) {
      toast.info("Connect your wallet first.");
      setError("Connect a wallet first.");
      return;
    }
    const clean =
      mode === "signin" && (user?.username || username)
        ? (user?.username || username).trim().toLowerCase().replace(/^@/, "")
        : username.trim().toLowerCase().replace(/^@/, "");
    if (!USERNAME_RE.test(clean)) {
      const msg = "Username must be 3-24 chars: a-z, 0-9, underscore.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setBusy(true);
    try {
      const keys = getOrCreateHushKeys(address);
      const cached = getStoredAuthSignature(address);
      let signature = cached;

      if (!signature) {
        const message = await getAuthMessage({
          wallet: address,
          username: clean,
          bulletPublicKey: keys.publicKey,
        });
        signature = await signMessageAsync({message});
        // Persist immediately so reconnect / silent-auth can reuse it.
        setStoredAuthSignature(address, signature);
      }

      let res;
      try {
        res = await walletAuth({
          wallet: address,
          username: clean,
          bulletPublicKey: keys.publicKey,
          signature,
        });
      } catch (e) {
        // Cached signature stale (key/username changed). Prompt once.
        if (!cached) throw e;
        clearStoredAuthSignature(address);
        const message = await getAuthMessage({
          wallet: address,
          username: clean,
          bulletPublicKey: keys.publicKey,
        });
        signature = await signMessageAsync({message});
        setStoredAuthSignature(address, signature);
        res = await walletAuth({
          wallet: address,
          username: clean,
          bulletPublicKey: keys.publicKey,
          signature,
        });
      }

      setStoredAuthSignature(address, signature);
      setSession(res.token, res.user);
      setKnown(true);
      toast.success(
        mode === "register"
          ? `Registered as @${res.user.username}`
          : cached && signature === cached
            ? `Welcome back @${res.user.username}`
            : `Signed in as @${res.user.username}`
      );
    } catch (e) {
      const msg = formatError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <Panel className="flex justify-center py-10">
        <LoaderIcon className="h-6 w-6 animate-spin text-graphite" />
      </Panel>
    );
  }

  if (isSignedIn && user && walletsMatch(user.wallet, address ?? user.wallet)) {
    return (
      <Panel className="animate-rise space-y-5 text-left">
        <div className="flex items-center gap-2 text-signal">
          <CheckIcon className="h-5 w-5" />
          <p className="text-sm font-medium text-ink">Signed in</p>
        </div>
        <div>
          <p className="text-3xl font-bold tracking-tight">@{user.username}</p>
          <p className="mt-2 truncate font-mono text-xs text-graphite">
            {user.wallet}
          </p>
        </div>
        <NetworkGate>
          <a href="/send" className="btn-primary">
            Send USDC
          </a>
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

  const step: 1 | 2 = isConnected ? 2 : 1;

  return (
    <Panel className="space-y-5 text-left">
      <AuthSteps step={step} />

      {!isConnected ? (
        <div className="space-y-4 py-1 text-center">
          <p className="text-sm leading-relaxed text-graphite">
            Connect your wallet first. Then sign in to unlock send and inbox.
          </p>
          <ConnectButton label="Connect wallet" />
        </div>
      ) : (
        <NetworkGate>
          {lookingUp ? (
            <div className="flex justify-center py-8">
              <LoaderIcon className="h-6 w-6 animate-spin text-graphite" />
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-paper/80 px-4 py-3">
                <p className="text-xs text-graphite">Wallet connected</p>
                <p className="mt-0.5 truncate font-mono text-xs text-ink">
                  {address}
                </p>
              </div>

              {needsUsername || !(known || user) ? (
                <>
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500"
                      aria-hidden
                    />
                    <p className="text-sm text-graphite">
                      No username for this wallet. Choose one and sign — your
                      signature is saved in local storage.
                    </p>
                  </div>
                  <div>
                    <FieldLabel>Choose a username</FieldLabel>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-graphite">
                        @
                      </span>
                      <input
                        type="text"
                        placeholder="username"
                        value={username.replace(/^@/, "")}
                        onChange={(e) =>
                          setUsername(e.target.value.replace(/^@/, ""))
                        }
                        autoComplete="off"
                        spellCheck={false}
                        className="field pl-8 text-lg"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => signInOrRegister("register")}
                    className="btn-primary"
                  >
                    {busy ? (
                      <LoaderIcon className="h-5 w-5 animate-spin" />
                    ) : null}
                    {busy ? "Confirm in wallet…" : "Sign and register"}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-graphite">Account found</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight">
                      @{(user?.username || username).replace(/^@/, "")}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500"
                      aria-hidden
                    />
                    <p className="text-sm text-graphite">
                      {hasCachedSignature
                        ? "Finish signing in. Your saved signature will be used."
                        : "Sign a message to finish signing in. Signature is stored in local storage."}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => signInOrRegister("signin")}
                    className="btn-primary"
                  >
                    {busy ? (
                      <LoaderIcon className="h-5 w-5 animate-spin" />
                    ) : null}
                    {busy
                      ? "Signing in…"
                      : hasCachedSignature
                        ? "Continue"
                        : "Sign in"}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => signOut({silent: true})}
                className="w-full text-center text-sm text-graphite hover:text-ink"
              >
                Disconnect wallet
              </button>
            </>
          )}
        </NetworkGate>
      )}

      {error ? (
        <ErrorBanner title={formatErrorTitle(error)} message={error} />
      ) : null}
    </Panel>
  );
}
