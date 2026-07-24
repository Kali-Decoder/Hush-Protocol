"use client";

import Link from "next/link";
import {useEffect, useState} from "react";
import {useAccount} from "wagmi";
import HeroSendBox from "@/components/HeroSendBox";
import {ConnectButton} from "@/components/ConnectButton";

/** Rotating tagline nouns / words after "send". */
const SEND_WORDS = [
  {word: "silently", color: "text-ink"},
  {word: "privacy", color: "text-signal"},
  {word: "hush", color: "text-[#2F6FED]"},
  {word: "notes", color: "text-[#7A5C3E]"},
  {word: "quietly", color: "text-amber"},
  {word: "silence", color: "text-[#8B5CF6]"},
  {word: "unseen", color: "text-graphite"},
] as const;

export default function LandingHero() {
  const {isConnected} = useAccount();
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [wordKey, setWordKey] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduceMotion(reduce);
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!ready || reduceMotion) return;
    const id = window.setInterval(() => {
      setWordIndex((i) => (i + 1) % SEND_WORDS.length);
      setWordKey((k) => k + 1);
    }, 2400);
    return () => window.clearInterval(id);
  }, [ready, reduceMotion]);

  const active = SEND_WORDS[wordIndex];

  return (
    <section className="relative flex min-h-[calc(100svh-5.5rem)] w-full max-w-4xl flex-col items-center justify-center overflow-hidden pb-8 pt-2 text-center sm:min-h-[calc(100svh-7rem)] sm:pt-4">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 -z-10 transition-opacity duration-1000 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute left-1/2 top-8 h-64 w-64 -translate-x-1/2">
          <div className="animate-orb h-full w-full rounded-full bg-white/70 blur-3xl motion-reduce:animate-none" />
        </div>
        <div className="absolute -left-10 bottom-24 h-48 w-48">
          <div className="animate-orb-slow h-full w-full rounded-full bg-fog/60 blur-3xl motion-reduce:animate-none" />
        </div>
        <div className="absolute -right-8 top-32 h-40 w-40">
          <div className="animate-orb h-full w-full rounded-full bg-signal/10 blur-3xl motion-reduce:animate-none" />
        </div>
      </div>

      <p
        className={`animate-rise inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.24em] text-graphite ${
          ready ? "" : "opacity-0"
        }`}
      >
        <span className="h-px w-5 bg-fog" aria-hidden />
        Hushh Protocol
        <span className="h-px w-5 bg-fog" aria-hidden />
      </p>

      <div
        className={`animate-rise mt-6 flex items-center justify-center gap-3 [animation-delay:60ms] ${
          ready ? "" : "opacity-0"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logomark.svg"
          alt=""
          className="h-12 w-12 rounded-[14px] shadow-[0_12px_32px_-14px_rgba(10,10,10,0.35)] ring-1 ring-ink/5 sm:h-14 sm:w-14 sm:rounded-2xl"
          aria-hidden
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wordmark.svg"
          alt="Hushh Protocol"
          className="h-8 w-auto sm:h-10"
        />
      </div>

      <h1
        className={`mt-8 text-[2.75rem] font-extrabold leading-[0.9] tracking-[-0.05em] sm:text-7xl md:text-8xl ${
          ready ? "" : "opacity-0"
        }`}
      >
        <span className="sr-only">send silently.</span>
        <span
          aria-hidden
          className="inline-flex flex-wrap items-baseline justify-center gap-x-[0.28em]"
        >
          <span
            className={
              reduceMotion || !ready
                ? "inline-block"
                : "animate-word-in inline-block"
            }
            style={
              reduceMotion || !ready ? undefined : {animationDelay: "180ms"}
            }
          >
            send
          </span>
          <span className="relative inline-grid justify-items-start">
            <span className="invisible col-start-1 row-start-1" aria-hidden>
              silently
            </span>
            {reduceMotion ? (
              <span className="col-start-1 row-start-1 inline-block text-ink">
                silently.
              </span>
            ) : (
              <span
                key={wordKey}
                className={`col-start-1 row-start-1 inline-block ${active.color} ${
                  ready ? "animate-word-swap" : ""
                }`}
              >
                {active.word}.
              </span>
            )}
          </span>
        </span>
      </h1>

      <p
        className={`mx-auto mt-6 max-w-lg text-base leading-relaxed tracking-[-0.01em] text-graphite sm:text-lg ${
          ready ? "" : "opacity-0"
        }`}
      >
        ZK-private USDC on Arc. Deposit a fixed note. They withdraw with a
        proof. Nothing on-chain connects the two.
      </p>

      <div
        className={`animate-rise mt-10 flex w-full flex-col items-center gap-6 [animation-delay:520ms] ${
          ready ? "" : "opacity-0"
        }`}
      >
        {!isConnected ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-3">
            <ConnectButton
              label="Connect wallet"
              className="btn-primary max-w-xs"
            />
            <p className="text-sm text-graphite">
              Connect first, then claim your Twitter handle.
            </p>
          </div>
        ) : (
          <HeroSendBox />
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {isConnected ? (
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold tracking-[-0.01em] text-paper shadow-[0_8px_20px_-12px_rgba(10,10,10,0.45)] transition hover:bg-ink/90 active:scale-[0.98]"
            >
              Connect Twitter
            </Link>
          ) : null}
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-fog/90 bg-white/70 px-5 py-2.5 text-sm font-medium tracking-[-0.01em] text-ink backdrop-blur-sm transition-colors hover:border-graphite hover:bg-white"
          >
            How it works
          </a>
        </div>
      </div>

      <div
        className={`animate-rise mt-16 flex flex-wrap items-center justify-center gap-x-3 gap-y-3 font-mono text-[11px] uppercase tracking-[0.18em] text-graphite/80 [animation-delay:600ms] ${
          ready ? "" : "opacity-0"
        }`}
      >
        {["Arc Testnet", "Groth16", "Fixed notes"].map((label, i) => (
          <span key={label} className="contents">
            {i > 0 ? (
              <span className="hidden text-fog sm:inline" aria-hidden>
                ·
              </span>
            ) : null}
            <span
              className={
                reduceMotion || !ready
                  ? undefined
                  : "animate-word-in inline-block"
              }
              style={
                reduceMotion || !ready
                  ? undefined
                  : {animationDelay: `${640 + i * 90}ms`}
              }
            >
              {label}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
