import {tokenHash} from "@bullet/sdk";
import type {Address} from "viem";

export type PoolToken = {
  address: Address;
  symbol: string;
  decimals: number;
  enabled: boolean;
  logo: string;
};

/** Tokens enabled on BulletPool (Flare Coston2). */
export const POOL_TOKENS: readonly PoolToken[] = [
  {
    address: "0x2049581cb5169881FAE7ed568465b97B51F7Dc6E",
    symbol: "USDC",
    decimals: 6,
    enabled: true,
    logo: "/tokens/usdc.png",
  },
] as const;

export const DEFAULT_POOL_TOKEN = POOL_TOKENS[0];

export function getPoolToken(addressOrSymbol: string): PoolToken | undefined {
  const q = addressOrSymbol.trim().toLowerCase();
  return POOL_TOKENS.find(
    (t) =>
      t.enabled &&
      (t.address.toLowerCase() === q || t.symbol.toLowerCase() === q)
  );
}

export function toTokenUnits(amount: number, decimals: number): bigint {
  const f = 10 ** decimals;
  return BigInt(Math.round(amount * f));
}

export function fromTokenUnits(
  raw: bigint | string,
  decimals: number
): string {
  const n = typeof raw === "bigint" ? raw : BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = n / base;
  const frac = n % base;
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "")}`;
}

export function resolvePoolToken(opts: {
  tokenSymbol?: string | null;
  tokenHash?: string | bigint | null;
}): PoolToken {
  if (opts.tokenSymbol) {
    const bySymbol = getPoolToken(opts.tokenSymbol);
    if (bySymbol) return bySymbol;
  }
  if (opts.tokenHash != null && opts.tokenHash !== "") {
    const want = BigInt(opts.tokenHash);
    const byHash = POOL_TOKENS.find((t) => tokenHash(t.address) === want);
    if (byHash) return byHash;
  }
  return DEFAULT_POOL_TOKEN;
}
