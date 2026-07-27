"use client";

import {useEffect, useState} from "react";
import {explorerTx} from "@/lib/config";
import {shortAddr} from "@/lib/address";
import {toast} from "@/lib/toast";
import type {ScratchTheme} from "@/lib/scratchGift";
import {ScratchRevealCard} from "@/components/ScratchRevealCard";
import {CheckIcon, CopyIcon, ExternalLinkIcon} from "@/components/icons";

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
    await navigator.clipboard.writeText(claimUrl);
    setCopied(true);
    toast.success("Scratch claim link copied.");
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scratch-send-success-title"
    >
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-md"
        aria-hidden
        onClick={onClose}
      />

      <div className="relative z-[1] flex max-h-[92dvh] w-full max-w-md animate-sheet-in flex-col overflow-y-auto rounded-t-3xl border border-fog bg-white shadow-[0_-12px_48px_-20px_rgba(10,10,10,0.35)] sm:rounded-3xl sm:shadow-[0_28px_64px_-28px_rgba(10,10,10,0.4)]">
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-fog sm:hidden" />
        <div className="space-y-4 px-6 pb-6 pt-6 text-center sm:px-8 sm:pt-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-signal/10 text-signal">
            <CheckIcon className="h-7 w-7" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-graphite">
            Scratch card sent
          </p>
          <h2
            id="scratch-send-success-title"
            className="text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          >
            Gift on the way
          </h2>
          <p className="text-sm text-graphite">
            @{recipientUsername} can scratch & claim from Inbox.
          </p>

          <ScratchRevealCard
            meta={{title, theme}}
            amountLabel={amountLabel}
            tokenSymbol={tokenSymbol}
            recipientLabel={`@${recipientUsername}`}
            revealed
          />

          <div className="rounded-2xl border border-fog bg-paper px-4 py-3 text-left">
            <p className="text-[10px] uppercase tracking-[0.14em] text-graphite">
              Claim link
            </p>
            <p className="mt-1 truncate font-mono text-xs text-ink">{claimUrl}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-fog bg-paper px-3 py-2.5 text-sm font-semibold text-ink"
            >
              <CopyIcon className="h-4 w-4" />
              {copied ? "Copied" : "Copy link"}
            </button>
            <a
              href={claimUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-3 py-2.5 text-sm font-semibold text-paper"
            >
              Open claim
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
          </div>

          {depositHash ? (
            <a
              href={explorerTx(depositHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-fog bg-paper px-3 py-1.5 text-xs font-medium text-ink"
            >
              <span className="text-graphite">Deposit</span>
              <span className="font-mono">{shortAddr(depositHash)}</span>
              <ExternalLinkIcon className="h-3 w-3 text-graphite" />
            </a>
          ) : null}

          <button type="button" onClick={onClose} className="btn-primary w-full">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
