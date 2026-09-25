"use client";

import {PrivyProvider} from "@privy-io/react-auth";
import type {ReactNode} from "react";
import {PrivyLogoutBridge} from "@/components/PrivyLogoutBridge";
import {arcTestnet} from "@/lib/chains";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

export function isPrivyConfigured() {
  return Boolean(PRIVY_APP_ID);
}

/**
 * Privy is the primary login: email or Twitter → embedded EVM wallet on Arc.
 * Wagmi talks to that wallet via `@privy-io/wagmi`.
 */
export function PrivyAppProvider({children}: {children: ReactNode}) {
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "twitter"],
        defaultChain: arcTestnet,
        supportedChains: [arcTestnet],
        appearance: {
          theme: "light",
          accentColor: "#0a0a0a",
          logo: "/logomark.png",
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <PrivyLogoutBridge />
      {children}
    </PrivyProvider>
  );
}
