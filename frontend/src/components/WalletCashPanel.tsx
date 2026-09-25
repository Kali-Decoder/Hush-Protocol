"use client";

import {useEffect, useMemo, useState, type ReactNode} from "react";
import {
  createPublicClient,
  http,
  isAddress,
  type Address,
} from "viem";
import {
  useAccount,
  useSendTransaction,
  useWriteContract,
} from "wagmi";
import {erc20Abi} from "@/abi/erc20";
import {
  arcTestnet,
  explorerTx,
  POOL_TOKENS,
  toTokenUnits,
  type PoolToken,
} from "@/lib/config";
import {useArcBalance, useTokenBalance} from "@/hooks/useUsdcBalance";
import {formatError} from "@/lib/errors";
import {toast} from "@/lib/toast";
import {shortAddr} from "@/lib/address";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  LoaderIcon,
  XBrandIcon,
} from "@/components/icons";
import {ErrorBanner, FieldLabel} from "@/components/ui";

type Mode = "deposit" | "withdraw" | null;

type WithdrawAsset =
  | {kind: "native"; symbol: string; decimals: number}
  | {kind: "token"; token: PoolToken};

export function WalletCashPanel({address}: {address: Address}) {
  const [mode, setMode] = useState<Mode>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
          Cash
        </h2>
        <p className="text-[11px] text-graphite">Fund or empty this wallet</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setMode("deposit")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fog bg-white px-4 py-3.5 text-sm font-semibold text-ink shadow-[0_8px_20px_-16px_rgba(10,10,10,0.35)] transition-all hover:border-graphite active:scale-[0.98]"
        >
          <ArrowDownLeftIcon className="h-4 w-4" />
          Deposit
        </button>
        <button
          type="button"
          onClick={() => setMode("withdraw")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3.5 text-sm font-semibold text-paper shadow-[0_8px_20px_-12px_rgba(10,10,10,0.45)] transition-all hover:bg-ink/90 active:scale-[0.98]"
        >
          <ArrowUpRightIcon className="h-4 w-4" />
          Withdraw
        </button>
      </div>

      {mode === "deposit" ? (
        <DepositSheet address={address} onClose={() => setMode(null)} />
      ) : null}
      {mode === "withdraw" ? (
        <WithdrawSheet address={address} onClose={() => setMode(null)} />
      ) : null}
    </section>
  );
}

function DepositSheet({
  address,
  onClose,
}: {
  address: Address;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const tokens = POOL_TOKENS.filter((t) => t.enabled);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Deposit address copied.");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn’t copy address.");
    }
  }

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <Sheet
      title="Deposit"
      subtitle="Send tokens to your Hushh wallet address. Privy created this address when you signed in."
      onClose={onClose}
    >
      <div className="rounded-2xl border border-fog bg-paper/70 px-4 py-3.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
          Your address
        </p>
        <p className="mt-2 break-all font-mono text-[13px] leading-relaxed text-ink">
          {address}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyAddress()}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-paper"
          >
            {copied ? (
              <CheckIcon className="h-3.5 w-3.5" />
            ) : (
              <CopyIcon className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy address"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
          Supported on Arc Testnet
        </p>
        <ul className="flex flex-wrap gap-2">
          <li className="rounded-full border border-fog bg-white px-3 py-1 text-xs font-semibold text-ink">
            {arcTestnet.nativeCurrency.symbol} (gas)
          </li>
          {tokens.map((t) => (
            <li
              key={t.address}
              className="inline-flex items-center gap-1.5 rounded-full border border-fog bg-white px-3 py-1 text-xs font-semibold text-ink"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.logo} alt="" className="h-3.5 w-3.5 rounded-full" />
              {t.symbol}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[12px] leading-relaxed text-graphite">
        Transfer from any wallet or exchange that supports Arc Testnet. Only
        send assets on this network — wrong-chain deposits can’t be recovered
        here.
      </p>
    </Sheet>
  );
}

function WithdrawSheet({
  address,
  onClose,
}: {
  address: Address;
  onClose: () => void;
}) {
  const arc = useArcBalance(address);
  const tokens = POOL_TOKENS.filter((t) => t.enabled);
  const assets = useMemo<WithdrawAsset[]>(
    () => [
      {
        kind: "native",
        symbol: arc.symbol,
        decimals: arcTestnet.nativeCurrency.decimals,
      },
      ...tokens.map((token) => ({kind: "token" as const, token})),
    ],
    [arc.symbol, tokens]
  );

  const [assetKey, setAssetKey] = useState("native");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const {writeContractAsync} = useWriteContract();
  const {sendTransactionAsync} = useSendTransaction();

  const selected: WithdrawAsset =
    assetKey === "native"
      ? assets[0]
      : (assets.find(
          (a) => a.kind === "token" && a.token.address === assetKey
        ) ?? assets[0]);

  const tokenBal = useTokenBalance(
    selected.kind === "token" ? selected.token : tokens[0],
    address
  );

  const balanceLabel =
    selected.kind === "native" ? arc.formatted : tokenBal.formatted;
  const symbol =
    selected.kind === "native" ? selected.symbol : selected.token.symbol;
  const decimals =
    selected.kind === "native" ? selected.decimals : selected.token.decimals;
  const rawBalance = selected.kind === "native" ? arc.raw : tokenBal.raw;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function handleWithdraw() {
    setError("");
    setTxHash(null);
    const dest = to.trim() as Address;
    if (!isAddress(dest)) {
      setError("Enter a valid destination address.");
      return;
    }
    if (dest.toLowerCase() === address.toLowerCase()) {
      setError("Destination can’t be your own Hushh wallet.");
      return;
    }
    const human = Number(amount);
    if (!Number.isFinite(human) || human <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    const units = toTokenUnits(human, decimals);
    if (units > rawBalance) {
      setError(`Insufficient ${symbol}. Balance is ${balanceLabel}.`);
      return;
    }

    setBusy(true);
    try {
      const client = createPublicClient({
        chain: arcTestnet,
        transport: http(),
      });

      let hash: `0x${string}`;
      if (selected.kind === "native") {
        hash = await sendTransactionAsync({
          to: dest,
          value: units,
          chainId: arcTestnet.id,
        });
      } else {
        hash = await writeContractAsync({
          address: selected.token.address,
          abi: erc20Abi,
          functionName: "transfer",
          args: [dest, units],
          chainId: arcTestnet.id,
        });
      }

      setTxHash(hash);
      toast.success("Withdrawal submitted.");
      await client.waitForTransactionReceipt({hash}).catch(() => undefined);
      void arc.refetch();
      void tokenBal.refetch();
    } catch (e) {
      const msg = formatError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Withdraw"
      subtitle="Send tokens from your Privy wallet to any address on Arc Testnet."
      onClose={onClose}
    >
      {error ? <ErrorBanner message={error} /> : null}

      <div className="space-y-2">
        <FieldLabel>Asset</FieldLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <AssetChip
            active={assetKey === "native"}
            label={arc.symbol}
            balance={arc.formatted}
            onClick={() => setAssetKey("native")}
          />
          {tokens.map((t) => (
            <TokenAssetChip
              key={t.address}
              token={t}
              address={address}
              active={assetKey === t.address}
              onClick={() => setAssetKey(t.address)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel>To address</FieldLabel>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="0x…"
          disabled={busy}
          spellCheck={false}
          className="field font-mono text-sm disabled:opacity-60"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <FieldLabel>Amount</FieldLabel>
          <button
            type="button"
            disabled={busy || rawBalance === 0n}
            onClick={() => setAmount(balanceLabel)}
            className="text-[11px] font-semibold text-graphite hover:text-ink disabled:opacity-40"
          >
            Max {balanceLabel} {symbol}
          </button>
        </div>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="0.00"
          disabled={busy}
          inputMode="decimal"
          className="field tabular-nums disabled:opacity-60"
        />
      </div>

      <button
        type="button"
        disabled={busy || !to.trim() || !amount}
        onClick={() => void handleWithdraw()}
        className="btn-primary"
      >
        {busy ? <LoaderIcon className="h-5 w-5 animate-spin" /> : null}
        {busy ? "Confirm in wallet…" : `Withdraw ${symbol}`}
      </button>

      {txHash ? (
        <a
          href={explorerTx(txHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-ink hover:opacity-70"
        >
          View {shortAddr(txHash)}
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </a>
      ) : null}

      <p className="text-[12px] leading-relaxed text-graphite">
        From {shortAddr(address)}. Keep a little {arc.symbol} for gas if you
        withdraw ERC-20s.
      </p>
    </Sheet>
  );
}

function TokenAssetChip({
  token,
  address,
  active,
  onClick,
}: {
  token: PoolToken;
  address: Address;
  active: boolean;
  onClick: () => void;
}) {
  const bal = useTokenBalance(token, address);
  return (
    <AssetChip
      active={active}
      label={token.symbol}
      balance={bal.formatted}
      logo={token.logo}
      onClick={onClick}
    />
  );
}

function AssetChip({
  active,
  label,
  balance,
  logo,
  onClick,
}: {
  active: boolean;
  label: string;
  balance: string;
  logo?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2.5 text-left transition-all ${
        active
          ? "border-ink bg-white ring-2 ring-ink/10"
          : "border-fog bg-white hover:border-graphite"
      }`}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="h-3.5 w-3.5 rounded-full" />
        ) : null}
        {label}
      </span>
      <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-graphite">
        {balance}
      </span>
    </button>
  );
}

function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-cash-title"
    >
      <div
        className="absolute inset-0 bg-ink/55 backdrop-blur-md animate-fade motion-reduce:animate-none"
        aria-hidden
        onClick={onClose}
      />
      <div className="relative z-[1] flex max-h-[92dvh] w-full max-w-md animate-sheet-in flex-col overflow-y-auto rounded-t-[1.75rem] border border-fog bg-white p-5 shadow-[0_-12px_48px_-20px_rgba(10,10,10,0.35)] motion-reduce:animate-none sm:animate-rise sm:rounded-[1.75rem] sm:p-6 sm:shadow-[0_28px_64px_-28px_rgba(10,10,10,0.4)]">
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-fog sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              id="wallet-cash-title"
              className="text-xl font-bold tracking-tight text-ink"
            >
              {title}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-graphite">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-fog px-3 py-1.5 text-xs font-semibold text-graphite hover:text-ink"
          >
            Close
          </button>
        </div>
        <div className="mt-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

/** Tiny helper used by profile empty state copy. */
export function LoginMethodsHint() {
  return (
    <p className="inline-flex items-center justify-center gap-2 text-xs text-graphite">
      <span className="inline-flex items-center gap-1">
        Email
      </span>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1">
        <XBrandIcon className="h-3 w-3" /> Twitter
      </span>
    </p>
  );
}
