import type {Metadata} from "next";
import {Geist_Mono, Inter} from "next/font/google";
import Link from "next/link";
import IslandNav from "@/components/IslandNav";
import {GithubIcon, XBrandIcon} from "@/components/icons";
import {Web3Provider} from "@/providers/Web3Provider";
import "./globals.css";

const inter = Inter({subsets: ["latin"], variable: "--font-inter"});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Hushh Protocol · send silently.",
  description:
    "ZK-private USDC payments on Arc. Deposit a note, withdraw with a Groth16 proof. Nothing on-chain connects the two.",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geistMono.variable} paper-surface min-h-screen font-sans text-ink antialiased`}
      >
        <Web3Provider>
          <div className="flex min-h-screen flex-col">
            <IslandNav />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-28 sm:pt-32">
              {children}
            </main>
            <footer className="mt-auto border-t border-fog/80 bg-paper/90 backdrop-blur-sm">
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
                  <Link
                    href="/privacy"
                    className="transition-colors hover:text-ink"
                  >
                    Privacy
                  </Link>
                  <a
                    href="https://x.com/BulletPayFi"
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
        </Web3Provider>
      </body>
    </html>
  );
}
