"use client";

import {formatUnits} from "viem";
import {useAccount, useBalance, useReadContract} from "wagmi";
import {erc20Abi} from "@/abi/erc20";
import {
  addresses,
  arcTestnet,
  fromUsdcUnits,
  toUsdcUnits,
} from "@/lib/config";
import {LoaderIcon} from "@/components/icons";

export function useUsdcBalance(owner?: `0x${string}`) {
  const {address, isConnected} = useAccount();
  const account = owner ?? address;
  const {usdc} = addresses();

  const {data, isLoading, isFetching, refetch, error} = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: !!account && isConnected,
      refetchInterval: 12_000,
    },
  });

  const raw = typeof data === "bigint" ? data : 0n;
  const formatted = fromUsdcUnits(raw);

  return {
    raw,
    formatted,
    isLoading: isConnected && !!account && isLoading,
    isFetching,
    error,
    refetch,
    hasEnough: (amountUsdc: number) => raw >= toUsdcUnits(amountUsdc),
  };
}

/** Native Arc Testnet balance (USDC gas token, 18 decimals). */
export function useArcBalance(owner?: `0x${string}`) {
  const {address, isConnected} = useAccount();
  const account = owner ?? address;

  const {data, isLoading, isFetching, refetch, error} = useBalance({
    address: account,
    chainId: arcTestnet.id,
    query: {
      enabled: !!account && isConnected,
      refetchInterval: 12_000,
    },
  });

  const raw = data?.value ?? 0n;
  const decimals = data?.decimals ?? arcTestnet.nativeCurrency.decimals;
  const symbol = data?.symbol ?? arcTestnet.nativeCurrency.symbol;
  const formatted = formatNative(raw, decimals);

  return {
    raw,
    formatted,
    symbol,
    isLoading: isConnected && !!account && isLoading,
    isFetching,
    error,
    refetch,
  };
}

function formatNative(raw: bigint, decimals: number): string {
  const s = formatUnits(raw, decimals);
  const [whole, frac = ""] = s.split(".");
  if (!frac || /^0+$/.test(frac)) return whole;
  const trimmed = frac.replace(/0+$/, "").slice(0, 6);
  return trimmed ? `${whole}.${trimmed}` : whole;
}

function BalanceRow({
  label,
  amount,
  symbol,
  isLoading,
  isFetching,
  onRefresh,
  compact = false,
  className = "",
}: {
  label: string;
  amount: string;
  symbol: string;
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl bg-paper/80 px-4 py-3 ${className}`}
    >
      <div className="min-w-0">
        <p className="text-xs text-graphite">{label}</p>
        {isLoading ? (
          <div className="mt-1 flex items-center gap-2 text-sm text-graphite">
            <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : (
          <p
            className={`mt-0.5 font-bold tracking-tight ${
              compact ? "text-lg" : "text-2xl"
            }`}
          >
            {amount}{" "}
            <span className="text-sm font-semibold text-graphite">{symbol}</span>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isFetching}
        className="shrink-0 text-xs font-medium text-graphite hover:text-ink disabled:opacity-50"
      >
        {isFetching ? "…" : "Refresh"}
      </button>
    </div>
  );
}

export function TokenBalance({
  label = "USDC balance",
  className = "",
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const {isConnected} = useAccount();
  const {formatted, isLoading, refetch, isFetching} = useUsdcBalance();

  if (!isConnected) return null;

  return (
    <BalanceRow
      label={label}
      amount={formatted}
      symbol="USDC"
      isLoading={isLoading}
      isFetching={isFetching}
      onRefresh={() => void refetch()}
      compact={compact}
      className={className}
    />
  );
}

export function ArcBalance({
  label = "Arc balance",
  className = "",
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const {isConnected} = useAccount();
  const {formatted, symbol, isLoading, refetch, isFetching} = useArcBalance();

  if (!isConnected) return null;

  return (
    <BalanceRow
      label={label}
      amount={formatted}
      symbol={symbol}
      isLoading={isLoading}
      isFetching={isFetching}
      onRefresh={() => void refetch()}
      compact={compact}
      className={className}
    />
  );
}

/** Native Arc + pool ERC-20 balances for the account screen. */
export function AccountBalances({className = ""}: {className?: string}) {
  const {isConnected} = useAccount();
  if (!isConnected) return null;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <ArcBalance />
      <TokenBalance label="Pool USDC" />
    </div>
  );
}
