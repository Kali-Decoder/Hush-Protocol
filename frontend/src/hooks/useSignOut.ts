"use client";

import {useConnect, useDisconnect} from "wagmi";
import {clearSession} from "@/lib/session";
import {toast} from "@/lib/toast";

/** Sign out of Hushh Protocol and disconnect the wallet together. */
export function useSignOut() {
  const {disconnectAsync} = useDisconnect();
  const {reset} = useConnect();

  return async function signOut(opts?: {
    redirect?: string;
    silent?: boolean;
  }) {
    clearSession();
    try {
      await disconnectAsync();
    } catch {
      // Wallet may already be disconnected.
    }
    reset();
    if (!opts?.silent) toast.info("Signed out. Wallet disconnected.");
    if (opts?.redirect && typeof window !== "undefined") {
      window.location.href = opts.redirect;
    }
  };
}
