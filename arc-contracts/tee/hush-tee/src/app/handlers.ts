import { ethers } from 'ethers';
import type { ExtensionCallRequest, ExtensionCallResponse } from './types.js';
import type { DeriveResult, SetLimitRequest, SetLimitResult, ApproveWithdrawalRequest, ApproveWithdrawalResult } from './types.js';
import { deriveNullifierSecret, hashAttestation } from './crypto.js';
import { OP_COMMAND_DERIVE_NULLIFIER, OP_COMMAND_SET_LIMIT, OP_COMMAND_APPROVE_WITHDRAWAL } from './config.js';

export function handleDeriveNullifier(req: ExtensionCallRequest): ExtensionCallResponse {
  const payload = req.payload as { user?: string };
  if (!payload.user) {
    return { success: false, error: 'Missing user' };
  }
  const policyId = ethers.hexlify(ethers.randomBytes(32));
  const nullifier = deriveNullifierSecret(payload.user, policyId);
  const data: DeriveResult = {
    nullifier,
    commitment: nullifier,
    policyId,
  };
  return { success: true, data: data as unknown as Record<string, unknown> };
}

export function handleSetLimit(req: ExtensionCallRequest): ExtensionCallResponse {
  const payload = req.payload as unknown as SetLimitRequest;
  if (!payload.user || !payload.policyId) {
    return { success: false, error: 'Missing user or policyId' };
  }
  const data: SetLimitResult = {
    policyId: payload.policyId,
    commitmentRoot: ethers.ZeroHash,
  };
  return { success: true, data: data as unknown as Record<string, unknown> };
}

export function handleApproveWithdrawal(req: ExtensionCallRequest): ExtensionCallResponse {
  const payload = req.payload as unknown as ApproveWithdrawalRequest;
  if (!payload.user || !payload.nullifier) {
    return { success: false, error: 'Missing user or nullifier' };
  }
  const payloadHash = ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(payload)),
  );
  const digest = hashAttestation({
    opType: req.op_type,
    opCommand: req.op_command,
    payloadHash,
    timestamp: Math.floor(Date.now() / 1000),
    nonce: Math.floor(Math.random() * 2 ** 32),
  });
  const data: ApproveWithdrawalResult = {
    approval: digest,
    nullifier: payload.nullifier,
  };
  return { success: true, data: data as unknown as Record<string, unknown> };
}

export function dispatchRequest(req: ExtensionCallRequest): ExtensionCallResponse {
  if (req.op_type !== 'HUSH') {
    return { success: false, error: `Unsupported op_type: ${req.op_type}` };
  }
  switch (req.op_command) {
    case OP_COMMAND_DERIVE_NULLIFIER:
      return handleDeriveNullifier(req);
    case OP_COMMAND_SET_LIMIT:
      return handleSetLimit(req);
    case OP_COMMAND_APPROVE_WITHDRAWAL:
      return handleApproveWithdrawal(req);
    default:
      return { success: false, error: `Unsupported op_command: ${req.op_command}` };
  }
}
