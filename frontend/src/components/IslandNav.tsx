"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useAccount} from "wagmi";
import {APP_CHROME_WIDTH} from "@/components/AppShell";
import {ConnectButton} from "@/components/ConnectButton";
import {UserAvatar} from "@/components/UserAvatar";
import {useSession} from "@/hooks/useSession";

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function PendingDot({show}: {show: boolean}) {
  if (!show) return null;
  return (
    <span
      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-ink"
      aria-hidden
    />
  );
}

export default function IslandNav() {
  const pathname = usePathname();
  const {isConnected} = useAccount();
  const {user, isSignedIn, hasProfile} = useSession();
  const needsSignIn = isConnected && !isSignedIn;
  const showApp = isSignedIn && !!user;
  const showProfile = showApp || hasProfile || isConnected;
  const matchChrome =
    showApp ||
    pathname.startsWith("/lookout") ||
    pathname.startsWith("/send") ||
    pathname.startsWith("/inbox") ||
    pathname.startsWith("/account");

  function tab(
    href: string,
    label: string,
    opts?: {showOnMobile?: boolean; pending?: boolean}
  ) {
    const active = navActive(pathname, href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors sm:px-3.5 sm:py-2 ${
          opts?.showOnMobile === false ? "hidden sm:inline-flex" : "inline-flex"
        } ${
          active
            ? "bg-paper text-ink"
            : "text-paper/85 hover:bg-white/10 hover:text-paper"
        }`}
      >
        {label}
        <PendingDot show={!!opts?.pending} />
        {opts?.pending ? (
          <span className="sr-only">Sign in required</span>
        ) : null}
      </Link>
    );
  }

  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        aria-label="Primary"
        className={`pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-ink/95 px-3 py-2 text-paper shadow-lg shadow-ink/15 backdrop-blur-md sm:gap-3 sm:px-4 sm:py-2.5 ${
          matchChrome ? APP_CHROME_WIDTH : "w-auto max-w-full"
        }`}
      >
        <Link
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className={`flex shrink-0 items-center gap-2 rounded-full pl-1 pr-1 transition-opacity sm:pr-2 ${
            pathname === "/" ? "opacity-100" : "opacity-90 hover:opacity-100"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logomark.svg"
            alt=""
            className="h-7 w-7 shrink-0 rounded-[9px]"
            aria-hidden
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/wordmark.svg"
            alt="Hussh"
            className="h-4 w-auto brightness-0 invert"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1 sm:gap-1.5">
          {showApp ? (
            <>
              {tab("/send", "Send")}
              {tab("/inbox", "Inbox")}
              {tab("/lookout", "Lookout", {showOnMobile: false})}
              <Link
                href="/account"
                aria-current={
                  navActive(pathname, "/account") ? "page" : undefined
                }
                className={`relative inline-flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold transition-colors sm:pr-3.5 ${
                  navActive(pathname, "/account")
                    ? "bg-paper text-ink"
                    : "text-paper/85 hover:bg-white/10 hover:text-paper"
                }`}
              >
                <UserAvatar address={user.wallet} size="sm" />
                @{user.username}
              </Link>
            </>
          ) : showProfile ? (
            <>
              {tab("/lookout", "Lookout")}
              {tab("/account", user ? `@${user.username}` : "Account", {
                pending: needsSignIn,
              })}
              {tab("/register", "Sign in", {pending: needsSignIn})}
            </>
          ) : (
            <>
              {tab("/lookout", "Lookout")}
              {tab("/register", "Sign in")}
            </>
          )}

          <ConnectButton
            compact
            label="Connect"
            className="shrink-0 rounded-full border border-paper/25 px-3 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-white/10"
          />
        </div>
      </nav>
    </header>
  );
}
