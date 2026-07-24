"use client";

import {useConnect, useDisconnect} from "wagmi";
import {logoutPrivySession} from "@/components/PrivyLogoutBridge";
import {clearSession} from "@/lib/session";
import {toast} from "@/lib/toast";

/** Sign out: clear Hushh session, disconnect wallet, and log out of Privy. */
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

    await logoutPrivySession();
    reset();

    if (!opts?.silent) toast.info("Signed out.");
    if (opts?.redirect && typeof window !== "undefined") {
      window.location.href = opts.redirect;
    }
  };
}
