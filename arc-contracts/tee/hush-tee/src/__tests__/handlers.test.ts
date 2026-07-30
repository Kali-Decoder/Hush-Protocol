import { describe, it, expect } from 'vitest';
import { handleDeriveNullifier, handleSetLimit, handleApproveWithdrawal, dispatchRequest } from '../app/handlers.js';

const USER = '0x0000000000000000000000000000000000000001';
const POLICY_ID = '0x0000000000000000000000000000000000000000000000000000000000000001';
const NULLIFIER = '0x1111111111111111111111111111111111111111111111111111111111111111';

describe('handleDeriveNullifier', () => {
  it('returns nullifier for a valid user', () => {
    const result = handleDeriveNullifier({
      op_type: 'HUSH',
      op_command: 'DERIVE_NULLIFIER',
      payload: { user: USER },
    });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('fails without user', () => {
    const result = handleDeriveNullifier({
      op_type: 'HUSH',
      op_command: 'DERIVE_NULLIFIER',
      payload: {},
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Missing user');
  });
});

describe('handleSetLimit', () => {
  it('returns success for valid input', () => {
    const result = handleSetLimit({
      op_type: 'HUSH',
      op_command: 'SET_LIMIT',
      payload: { user: USER, policyId: POLICY_ID, minInterval: 3600, maxAmount: '1000', validFrom: 0, validTo: 9999999999 },
    });
    expect(result.success).toBe(true);
  });
});

describe('handleApproveWithdrawal', () => {
  it('returns approval for valid input', () => {
    const result = handleApproveWithdrawal({
      op_type: 'HUSH',
      op_command: 'APPROVE_WITHDRAWAL',
      payload: { user: USER, nullifier: NULLIFIER, amount: '100', recipient: USER },
    });
    expect(result.success).toBe(true);
    expect(result.data?.approval).toBeDefined();
  });
});

describe('dispatchRequest', () => {
  it('routes to correct handler', () => {
    const result = dispatchRequest({
      op_type: 'HUSH',
      op_command: 'DERIVE_NULLIFIER',
      payload: { user: USER },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unsupported op_type', () => {
    const result = dispatchRequest({
      op_type: 'INVALID',
      op_command: 'DERIVE_NULLIFIER',
      payload: { user: USER },
    });
    expect(result.success).toBe(false);
  });
});
