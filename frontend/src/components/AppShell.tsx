import type {ReactNode} from "react";

/** Shared with IslandNav so the phone frame matches the header width. */
export const APP_CHROME_WIDTH = "w-full max-w-3xl";

/**
 * Phone-screen shell: same width as the island nav header.
 * Full-bleed on mobile; framed card on larger screens.
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
    <div className={`animate-fade mx-auto h-full ${APP_CHROME_WIDTH}`}>
      <div className="flex min-h-[calc(100dvh-5rem)] flex-col overflow-hidden border-ink/12 bg-white max-sm:border-y sm:min-h-[min(44rem,calc(100dvh-10rem))] sm:rounded-[2.25rem] sm:border">
        <div
          className="hidden shrink-0 justify-center border-b border-fog bg-paper/50 px-3 py-3 sm:flex"
          aria-hidden
        >
          <span className="h-1 w-16 rounded-full bg-fog" />
        </div>

        <div className="flex flex-1 flex-col px-4 pb-5 pt-5 sm:px-6 sm:pb-4 sm:pt-7">
          <header className="mb-5 space-y-1.5 text-left sm:mb-6 sm:space-y-2">
            <h1 className="text-[1.75rem] font-bold tracking-tight sm:text-[2rem]">
              {title}
            </h1>
            {subtitle ? (
              <p className="max-w-prose text-sm leading-relaxed text-graphite">
                {subtitle}
              </p>
            ) : null}
          </header>

          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>

        <div
          className="flex shrink-0 justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:pb-3"
          aria-hidden
        >
          <span className="h-1 w-28 rounded-full bg-ink/15" />
        </div>
      </div>
    </div>
  );
}
