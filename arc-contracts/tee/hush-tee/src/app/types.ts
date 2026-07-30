import type { HushOpCommand } from './config.js';

export interface NullifierPolicy {
  user: string;
  policyId: string;
  minInterval: number;
  maxAmount: bigint;
  validFrom: number;
  validTo: number;
}

export interface DeriveResult {
  nullifier: string;
  commitment: string;
  policyId: string;
}

export interface SetLimitRequest {
  user: string;
  policyId: string;
  minInterval: number;
  maxAmount: string;
  validFrom: number;
  validTo: number;
}

export interface SetLimitResult {
  policyId: string;
  commitmentRoot: string;
}

export interface ApproveWithdrawalRequest {
  user: string;
  nullifier: string;
  amount: string;
  recipient: string;
}

export interface ApproveWithdrawalResult {
  approval: string;
  nullifier: string;
}

export interface ExtensionCallPayload {
  [key: string]: unknown;
}

export interface ExtensionCallRequest {
  op_type: string;
  op_command: HushOpCommand;
  payload: ExtensionCallPayload;
}

export interface ExtensionCallResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}
