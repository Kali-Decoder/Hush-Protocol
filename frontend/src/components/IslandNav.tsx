"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {APP_CHROME_WIDTH} from "@/components/AppShell";
import {ConnectButton} from "@/components/ConnectButton";
import {UserAvatar} from "@/components/UserAvatar";
import {useSession} from "@/hooks/useSession";

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function IslandNav() {
  const pathname = usePathname();
  const {user, isSignedIn} = useSession();
  const showApp = isSignedIn && !!user;
  const matchChrome =
    showApp ||
    pathname.startsWith("/lookout") ||
    pathname.startsWith("/send") ||
    pathname.startsWith("/inbox") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/register");

  function tab(
    href: string,
    label: string,
    opts?: {showOnMobile?: boolean}
  ) {
    const active = navActive(pathname, href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative shrink-0 rounded-full px-2.5 py-1.5 text-[13px] font-semibold transition-colors sm:px-3.5 sm:py-2 sm:text-sm ${
          opts?.showOnMobile === false ? "hidden sm:inline-flex" : "inline-flex"
        } ${
          active
            ? "bg-paper text-ink"
            : "text-paper/85 hover:bg-white/10 hover:text-paper"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:top-4 sm:px-4 sm:pt-0">
      <nav
        aria-label="Primary"
        className={`pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-ink/95 px-2.5 py-1.5 text-paper shadow-lg shadow-ink/15 backdrop-blur-md sm:gap-3 sm:px-4 sm:py-2.5 ${
          matchChrome ? APP_CHROME_WIDTH : "w-auto"
        }`}
      >
        <Link
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className={`flex shrink-0 items-center gap-2 rounded-full pl-0.5 pr-0.5 transition-opacity sm:pr-2 ${
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
            alt="Hushh Protocol"
            className="hidden h-4 w-auto brightness-0 invert sm:block"
          />
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-1.5 [&::-webkit-scrollbar]:hidden">
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
                title={`@${user.username}`}
                className={`relative inline-flex max-w-[7.5rem] shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-2 text-[13px] font-semibold transition-colors sm:max-w-none sm:gap-2 sm:pr-3.5 sm:text-sm ${
                  navActive(pathname, "/account")
                    ? "bg-paper text-ink"
                    : "text-paper/85 hover:bg-white/10 hover:text-paper"
                }`}
              >
                <UserAvatar address={user.wallet} size="sm" />
                <span className="truncate">@{user.username}</span>
              </Link>
            </>
          ) : (
            <>{tab("/lookout", "Lookout")}</>
          )}

          <ConnectButton
            compact
            label="Connect"
            className="shrink-0 rounded-full border border-paper/25 px-2.5 py-1.5 text-[13px] font-medium text-paper transition-colors hover:bg-white/10 sm:px-3 sm:text-sm"
          />
        </div>
      </nav>
    </header>
  );
}
