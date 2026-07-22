"use client";

import type {ReactNode} from "react";

/** Shared with IslandNav so the phone frame matches the header width. */
export const APP_CHROME_WIDTH = "w-full max-w-3xl";

/**
 * Phone-screen shell: same width as the island nav header.
 * App links live in the header; this frame is the screen body.
 */
export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className={`animate-fade mx-auto ${APP_CHROME_WIDTH}`}>
      <div className="flex min-h-[min(40rem,calc(100dvh-9.5rem))] flex-col overflow-hidden rounded-[2rem] border border-ink/12 bg-white sm:min-h-[min(44rem,calc(100dvh-10rem))] sm:rounded-[2.25rem]">
        <div className="flex shrink-0 justify-center border-b border-fog bg-paper/50 px-3 py-3" aria-hidden>
          <span className="h-1 w-16 rounded-full bg-fog" />
        </div>

        <div className="flex flex-1 flex-col px-5 pb-4 pt-6 sm:px-6 sm:pt-7">
          <header className="mb-6 space-y-2 text-left">
            <h1 className="text-3xl font-bold tracking-tight sm:text-[2rem]">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm leading-relaxed text-graphite">{subtitle}</p>
            ) : null}
          </header>

          <div className="flex flex-1 flex-col">{children}</div>
        </div>

        <div className="flex shrink-0 justify-center pb-3 pt-1" aria-hidden>
          <span className="h-1 w-28 rounded-full bg-ink/15" />
        </div>
      </div>
    </div>
  );
}
