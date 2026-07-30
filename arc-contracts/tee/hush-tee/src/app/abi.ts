import { ethers } from 'ethers';

const HUSH_DERIVE_ABI =
  'function hushDerive(address user, bytes32 policyId, uint256 minInterval, uint256 maxAmount, uint256 validFrom, uint256 validTo) returns (bytes32 nullifier, bytes32 commitment)';

const HUSH_APPROVE_ABI =
  'function hushApproveWithdrawal(bytes32 nullifier, uint256 amount, address recipient) returns (bytes32 approval)';

export interface DeriveParams {
  user: string;
  policyId: string;
  minInterval: bigint;
  maxAmount: bigint;
  validFrom: bigint;
  validTo: bigint;
}

export interface ApproveParams {
  nullifier: string;
  amount: bigint;
  recipient: string;
}

const deriveIface = new ethers.Interface([HUSH_DERIVE_ABI]);
const approveIface = new ethers.Interface([HUSH_APPROVE_ABI]);

export function encodeDerive(params: DeriveParams): string {
  return deriveIface.encodeFunctionData('hushDerive', [
    params.user,
    params.policyId,
    params.minInterval,
    params.maxAmount,
    params.validFrom,
    params.validTo,
  ]);
}

export function encodeApprove(params: ApproveParams): string {
  return approveIface.encodeFunctionData('hushApproveWithdrawal', [
    params.nullifier,
    params.amount,
    params.recipient,
  ]);
}

export function decodeDeriveResult(data: string): { nullifier: string; commitment: string } {
  const decoded = deriveIface.decodeFunctionResult('hushDerive', data);
  return { nullifier: decoded[0], commitment: decoded[1] };
}

export function decodeApproveResult(data: string): { approval: string } {
  const decoded = approveIface.decodeFunctionResult('hushApproveWithdrawal', data);
  return { approval: decoded[0] };
}
