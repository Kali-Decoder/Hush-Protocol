/**
 * API types used by the frontend against backend + indexer.
 *
 * Crypto / proving: Hushh Protocol SDK (linked later).
 * Chain calls: viem / contracts on Flare.
 */

// ─── Users / auth (arc-contracts/backend) ─────────────────────────────

/** Public profile returned by GET /users/:username and auth responses. */
export interface PublicUser {
  id: string;
  /** Lowercase checksummed-normalized EVM address. */
  wallet: string;
  /** Lowercase, no leading @. */
  username: string;
  /** 0x-prefixed 32-byte hex Hushh Protocol public key (encryption). */
  bulletPublicKey: string;
  /** Linked X/Twitter handle (no @), from Privy. */
  twitterUsername?: string | null;
  createdAt?: string | Date;
}

export interface WalletAuthRequest {
  wallet: string;
  username: string;
  bulletPublicKey: string;
  /** personal_sign of the auth message. */
  signature: `0x${string}`;
}

export interface AuthMessageResponse {
  message: string;
}

export interface WalletAuthResponse {
  token: string;
  user: PublicUser;
  message: string;
}

/**
 * Username resolve result for the send flow.
 * Prefer GET /users/:username (404 = unregistered).
 */
export interface ResolveResult {
  found: boolean;
  user?: PublicUser;
}

// ─── Notes / encrypted inbox (arc-contracts/backend) ──────────────────

export interface Note {
  id: string;
  recipientId: string;
  senderId?: string;
  /** 0x-prefixed 32-byte Poseidon commitment. */
  commitment: string;
  /** Client-sealed ciphertext (base64 or hex). Backend never decrypts. */
  encryptedPayload: string;
  claimed: boolean;
  /** Withdraw tx hash when claimed. */
  claimTxHash?: string;
  /** Deposit tx hash when sent. */
  depositTxHash?: string;
  /** Human amount for history UI. */
  amount?: string;
  /** Pool token symbol (USDC, EURC, cirBTC, USYC, …). */
  tokenSymbol?: string;
  recipientUsername?: string;
  createdAt: string | Date;
}

export interface NoteHistoryItem {
  id: string;
  direction: "sent" | "received";
  commitment: string;
  claimed: boolean;
  claimTxHash?: string;
  depositTxHash?: string;
  amount?: string;
  tokenSymbol?: string;
  createdAt: string | Date;
  /** Sender @username */
  fromUsername?: string;
  /** Recipient @username */
  toUsername?: string;
  fromWallet?: string;
  toWallet?: string;
  counterpartyUsername?: string;
  counterpartyWallet?: string;
}

export interface NoteHistoryPage {
  items: NoteHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  direction: "sent" | "received";
}

export interface CreateNoteRequest {
  recipientUsername?: string;
  recipientId?: string;
  commitment: string;
  encryptedPayload: string;
  depositTxHash?: string;
  amount?: string;
  tokenSymbol?: string;
}

export interface ClaimNoteResponse {
  id: string;
  claimed: boolean;
  commitment: string;
  claimTxHash?: string;
}

export interface ApiError {
  error: string;
}

// ─── Indexer (arc-contracts/indexer) ──────────────────────────────────

export interface IndexerHealth {
  ok: boolean;
  service?: string;
}

export interface IndexerRootResponse {
  root: string;
  leafCount: number;
  posted?: boolean;
}

/** GET /witness/:commitment — Merkle path for proving. No secrets. */
export interface WitnessResponse {
  root: string;
  leafIndex: number;
  siblings: string[];
  pathIndices: number[];
}

// ─── Network / deployments ───────────────────────────────────────────

export interface FlareNetworkConfig {
  chainId: 114;
  name: "Flare Testnet Coston2";
  rpcUrl: string;
  explorerUrl: string;
}

export interface HushDeployments {
  bulletPool: `0x${string}`;
  merkleRootManager: `0x${string}`;
  verifier: `0x${string}`;
  mockUsdc?: `0x${string}`;
}

/** Coston2 deploy — mirrors arc-contracts/deployments/coston2.json */
export const COSTON2_DEPLOYMENT = {
  chainId: 114,
  deployer: "0x587A253330826dDE12A91f9071084575B865E855",
  bulletPool: "0x587A253330826dDE12A91f9071084575B865E855",
  merkleRootManager: "0x5Ef5B083C14d97aaBD693C914Ed6a46E068585b9",
  verifier: "0x0F1a6ef28a4783dBCc4bb602aF67AB253eb869b9",
  mockUsdc: "0x2049581cb5169881FAE7ed568465b97B51F7Dc6E",
} as const satisfies HushDeployments & {
  chainId: number;
  deployer: `0x${string}`;
};

/** Prefer NEXT_PUBLIC_* env, fall back to COSTON2_DEPLOYMENT. */
export function getDeployments(): HushDeployments {
  const env = (key: string, fallback: `0x${string}`): `0x${string}` => {
    const v = process.env[key];
    return (v && /^0x[a-fA-F0-9]{40}$/.test(v) ? v : fallback) as `0x${string}`;
  };
  return {
    bulletPool: env(
      "NEXT_PUBLIC_BULLET_POOL_ADDRESS",
      COSTON2_DEPLOYMENT.bulletPool
    ),
    merkleRootManager: env(
      "NEXT_PUBLIC_MERKLE_ROOT_MANAGER_ADDRESS",
      COSTON2_DEPLOYMENT.merkleRootManager
    ),
    verifier: env(
      "NEXT_PUBLIC_VERIFIER_ADDRESS",
      COSTON2_DEPLOYMENT.verifier
    ),
    mockUsdc: env(
      "NEXT_PUBLIC_USDC_ADDRESS",
      COSTON2_DEPLOYMENT.mockUsdc
    ),
  };
}
