"use client";

import {useDisconnect} from "wagmi";
import {clearSession} from "@/lib/session";
import {toast} from "@/lib/toast";

/** Sign out of Hushh Protocol and disconnect the wallet together. */
export function useSignOut() {
  const {disconnect} = useDisconnect();

  return function signOut(opts?: {redirect?: string; silent?: boolean}) {
    clearSession();
    disconnect();
    if (!opts?.silent) toast.info("Signed out. Wallet disconnected.");
    if (opts?.redirect && typeof window !== "undefined") {
      window.location.href = opts.redirect;
    }
  };
}
