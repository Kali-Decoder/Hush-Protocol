"use client";

import type {ReactNode} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import IslandNav from "@/components/IslandNav";
import {GithubIcon} from "@/components/icons";

function isAppRoute(pathname: string) {
  return (
    pathname.startsWith("/lookout") ||
    pathname.startsWith("/send") ||
    pathname.startsWith("/inbox") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/register")
  );
}

export function AppChrome({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const app = isAppRoute(pathname);

  return (
    <div className="flex min-h-dvh flex-col">
      <IslandNav />
      <main
        className={
          app
            ? "mx-auto w-full max-w-5xl flex-1 px-0 pb-0 pt-[4.75rem] sm:px-4 sm:pb-16 sm:pt-28"
            : "mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24 sm:pt-32"
        }
      >
        {children}
      </main>
      <footer
        className={`mt-auto border-t border-fog/80 bg-paper/90 backdrop-blur-sm ${
          app ? "hidden sm:block" : ""
        }`}
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <Link href="/" className="flex items-center gap-2 opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logomark.svg"
              alt=""
              className="h-7 w-7 rounded-[9px]"
              aria-hidden
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wordmark.svg" alt="Hushh Protocol" className="h-4 w-auto" />
          </Link>
          <nav className="flex items-center gap-6 text-sm text-graphite">
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <a
              href="https://github.com/Kali-Decoder/Hush-"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hushh Protocol on GitHub"
              className="transition-colors hover:text-ink"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
