"use client";

import type {ReactNode} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {ClickSoundProvider} from "@/components/ClickSoundProvider";
import IslandNav from "@/components/IslandNav";
import {GithubIcon, XBrandIcon} from "@/components/icons";
import {isAppShellPath} from "@/lib/routes";

export function AppChrome({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const app = isAppShellPath(pathname);

  return (
    <div className="flex min-h-dvh flex-col">
      <ClickSoundProvider />
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
        className={`mt-auto border-t border-fog/70 bg-paper/80 backdrop-blur-md ${
          app ? "hidden sm:block" : ""
        }`}
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-7 sm:flex-row">
          <Link
            href="/"
            className="flex items-center gap-2 opacity-85 transition-opacity hover:opacity-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logomark.png"
              alt=""
              className="h-7 w-7 rounded-[9px] ring-1 ring-ink/5"
              aria-hidden
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wordmark.svg" alt="Hushh Protocol" className="h-4 w-auto" />
          </Link>
          <nav className="flex items-center gap-6 text-sm tracking-[-0.01em] text-graphite">
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <a
              href="https://x.com/hushhprotocol"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hushh Protocol on X"
              className="transition-colors hover:text-ink"
            >
              <XBrandIcon className="h-4 w-4" />
            </a>
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
