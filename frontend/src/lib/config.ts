import {ARC_TESTNET_DEPLOYMENT, getDeployments} from "@/shared";
import {arcTestnet} from "@/lib/chains";

export {arcTestnet};

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:4020";
export const INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL || "http://127.0.0.1:4010";
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL || "https://testnet.arcscan.app";

export const USDC_DECIMALS = 6;
export const AMOUNT_PRESETS = [1, 10, 50, 100] as const;

export function addresses() {
  const d = getDeployments();
  return {
    pool: d.bulletPool,
    rootManager: d.merkleRootManager,
    verifier: d.verifier,
    usdc: (d.mockUsdc || ARC_TESTNET_DEPLOYMENT.mockUsdc) as `0x${string}`,
  };
}

export function explorerTx(hash: string) {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function explorerAddress(addr: string) {
  return `${EXPLORER_URL}/address/${addr}`;
}

export function toUsdcUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

export function fromUsdcUnits(raw: bigint | string): string {
  const n = typeof raw === "bigint" ? raw : BigInt(raw);
  const whole = n / 10n ** BigInt(USDC_DECIMALS);
  const frac = n % 10n ** BigInt(USDC_DECIMALS);
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac.toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "")}`;
}
