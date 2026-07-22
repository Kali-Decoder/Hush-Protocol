"use client";

import {useEffect, useRef} from "react";
import {useAccount} from "wagmi";
import {resolveUserByWallet, walletAuth} from "@/lib/api";
import {
  clearStoredAuthSignature,
  getStoredAuthSignature,
} from "@/lib/authSignature";
import {getOrCreateHushKeys} from "@/lib/crypto";
import {
  clearLiveSession,
  clearSession,
  getStoredUser,
  getToken,
  notifySession,
  setSession,
  setStoredUser,
  walletsMatch,
} from "@/lib/session";
import {toast} from "@/lib/toast";

/**
 * Keeps local session aligned with the connected wallet.
 * Disconnect clears JWT/profile but keeps the cached signature so reconnect
 * can silent-auth. Explicit logout (clearSession) removes the signature.
 */
export function AuthSync() {
  const {address, isConnected, status} = useAccount();
  const last = useRef<string | null>(null);
  const wasConnected = useRef(false);
  const silentAuthing = useRef(false);

  useEffect(() => {
    if (status === "connecting" || status === "reconnecting") return;

    async function sync() {
      if (!isConnected || !address) {
        if (wasConnected.current) {
          wasConnected.current = false;
          last.current = null;
          const hadSession = !!(getToken() || getStoredUser());
          if (hadSession) {
            // Keep auth signature for this wallet; only drop live session.
            clearLiveSession();
            toast.info("Wallet disconnected. Reconnect to continue.");
          } else {
            notifySession();
          }
        } else {
          last.current = null;
          notifySession();
        }
        return;
      }

      wasConnected.current = true;
      const lower = address.toLowerCase();
      if (last.current === lower) return;
      last.current = lower;

      const stored = getStoredUser();
      if (stored && !walletsMatch(stored.wallet, address)) {
        clearSession({wallet: stored.wallet});
        toast.info("Wallet changed. Sign in again.");
      }

      try {
        const profile = await resolveUserByWallet(address);
        if (!profile) {
          const current = getStoredUser();
          if (current) clearLiveSession();
          else notifySession();
          return;
        }

        const token = getToken();
        if (token) {
          setSession(token, profile);
          return;
        }

        // No JWT: try cached signature so MetaMask is not needed again.
        const cached = getStoredAuthSignature(address);
        if (cached && !silentAuthing.current) {
          silentAuthing.current = true;
          try {
            const keys = getOrCreateHushKeys(address);
            const res = await walletAuth({
              wallet: address,
              username: profile.username,
              bulletPublicKey: keys.publicKey,
              signature: cached,
            });
            setSession(res.token, res.user);
            return;
          } catch {
            clearStoredAuthSignature(address);
          } finally {
            silentAuthing.current = false;
          }
        }

        setStoredUser(profile);
      } catch {
        notifySession();
      }
    }

    void sync();
  }, [address, isConnected, status]);

  return null;
}
