"use client";

import {useEffect, useState} from "react";
import {explorerTx} from "@/lib/config";
import {shortAddr} from "@/lib/address";
import {toast} from "@/lib/toast";
import type {ScratchTheme} from "@/lib/scratchGift";
import {ScratchRevealCard} from "@/components/ScratchRevealCard";
import {CheckIcon, CopyIcon, ExternalLinkIcon} from "@/components/icons";

const THEME_GLOW: Record<ScratchTheme, string> = {
  crimson: "from-[#f07a1a]/30 via-[#f07a1a]/8 to-transparent",
  azure: "from-[#2f6fed]/30 via-[#2f6fed]/8 to-transparent",
  emerald: "from-[#0f9f6e]/30 via-[#0f9f6e]/8 to-transparent",
};

type Props = {
  title: string;
  theme: ScratchTheme;
  amountLabel: string;
  tokenSymbol: string;
  recipientUsername: string;
  claimUrl: string;
  depositHash?: string;
  onClose: () => void;
};

export function ScratchSendSuccessModal({
  title,
  theme,
  amountLabel,
  tokenSymbol,
  recipientUsername,
  claimUrl,
  depositHash,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(claimUrl);
      setCopied(true);
      toast.success("Scratch claim link copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn’t copy link.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scratch-send-success-title"
    >
      <div
        className="absolute inset-0 bg-ink/55 backdrop-blur-md animate-fade motion-reduce:animate-none"
        aria-hidden
        onClick={onClose}
      />

      <div className="relative z-[1] flex max-h-[92dvh] w-full max-w-md animate-sheet-in flex-col overflow-y-auto rounded-t-3xl border border-fog bg-white shadow-[0_-12px_48px_-20px_rgba(10,10,10,0.35)] motion-reduce:animate-none sm:animate-rise sm:rounded-3xl sm:shadow-[0_28px_64px_-28px_rgba(10,10,10,0.4)]">
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${THEME_GLOW[theme]}`}
          aria-hidden
        />
        <div className="relative mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-fog sm:hidden" />

        <div className="relative px-6 pb-1 pt-5 text-center sm:px-8 sm:pt-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-signal/10 text-signal animate-amount-pop motion-reduce:animate-none">
            <CheckIcon className="h-7 w-7" />
          </div>

          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-graphite">
            Scratch card sent
          </p>

          <h2
            id="scratch-send-success-title"
            className="mt-2 animate-amount-pop text-4xl font-bold tracking-tight text-ink motion-reduce:animate-none sm:text-5xl"
          >
            {amountLabel}{" "}
            <span className="text-[0.55em] font-semibold text-graphite">
              {tokenSymbol}
            </span>
          </h2>

          <p className="mt-2 text-sm text-graphite">
            Gift for{" "}
            <span className="font-semibold text-ink">@{recipientUsername}</span>
          </p>
        </div>

        <div className="relative space-y-4 px-6 py-5 sm:px-8 sm:pb-7">
          <ScratchRevealCard
            meta={{title, theme}}
            amountLabel={amountLabel}
            tokenSymbol={tokenSymbol}
            recipientLabel={`@${recipientUsername}`}
            revealed
            tilt
            stage
            className="animate-soft-rise motion-reduce:animate-none"
          />

          <div className="rounded-2xl border border-fog bg-paper/90 px-4 py-3.5 text-left">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
                Claim link
              </p>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink transition-opacity hover:opacity-70"
              >
                {copied ? (
                  <CheckIcon className="h-3.5 w-3.5 text-signal" />
                ) : (
                  <CopyIcon className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1.5 break-all font-mono text-[11px] leading-relaxed text-ink">
              {claimUrl}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-graphite">
              They can also open it from Inbox → Gift cards.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-fog bg-paper px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-graphite"
            >
              <CopyIcon className="h-4 w-4" />
              {copied ? "Copied" : "Copy link"}
            </button>
            <a
              href={claimUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-3 py-2.5 text-sm font-semibold text-paper transition-transform duration-200 hover:bg-ink/90 active:scale-[0.98]"
            >
              Preview
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
          </div>

          {depositHash ? (
            <div className="flex justify-center">
              <a
                href={explorerTx(depositHash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-fog bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-graphite"
              >
                <span className="text-graphite">Deposit</span>
                <span className="font-mono">{shortAddr(depositHash)}</span>
                <ExternalLinkIcon className="h-3 w-3 text-graphite" />
              </a>
            </div>
          ) : null}

          <button type="button" onClick={onClose} className="btn-primary w-full">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
