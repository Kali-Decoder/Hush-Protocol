import {COSTON2_DEPLOYMENT, getDeployments} from "@/shared";
import {activeChain} from "@/lib/chains";
import {
  DEFAULT_POOL_TOKEN,
  fromTokenUnits,
  getPoolToken,
  POOL_TOKENS,
  resolvePoolToken,
  toTokenUnits,
} from "@/lib/tokens";

export {activeChain};
export {
  POOL_TOKENS,
  DEFAULT_POOL_TOKEN,
  toTokenUnits,
  fromTokenUnits,
  getPoolToken,
  resolvePoolToken,
};
export type {PoolToken} from "@/lib/tokens";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:4020";
export const INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL || "http://127.0.0.1:4010";
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL || "https://coston2-explorer.flare.network";

/** @deprecated Prefer token.decimals from POOL_TOKENS */
export const USDC_DECIMALS = 6;
export const AMOUNT_PRESETS = [1, 10, 50, 100] as const;

export function addresses() {
  const d = getDeployments();
  return {
    pool: d.bulletPool,
    rootManager: d.merkleRootManager,
    verifier: d.verifier,
    usdc: (d.mockUsdc ||
      DEFAULT_POOL_TOKEN.address ||
      COSTON2_DEPLOYMENT.mockUsdc) as `0x${string}`,
  };
}

export function explorerTx(hash: string) {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function explorerAddress(addr: string) {
  return `${EXPLORER_URL}/address/${addr}`;
}

export function toUsdcUnits(amount: number): bigint {
  return toTokenUnits(amount, USDC_DECIMALS);
}

export function fromUsdcUnits(raw: bigint | string): string {
  return fromTokenUnits(raw, USDC_DECIMALS);
}
