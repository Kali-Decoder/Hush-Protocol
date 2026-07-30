import { describe, it, expect } from 'vitest';
import { encodeDerive, encodeApprove } from '../app/abi.js';

describe('encodeDerive', () => {
  it('returns hex-encoded function data', () => {
    const data = encodeDerive({
      user: '0x0000000000000000000000000000000000000001',
      policyId: '0x' + 'ab'.repeat(32),
      minInterval: 3600n,
      maxAmount: 1000n,
      validFrom: 0n,
      validTo: 9999999999n,
    });
    expect(data).toMatch(/^0x[0-9a-f]{8,}$/);
  });
});

describe('encodeApprove', () => {
  it('returns hex-encoded function data', () => {
    const data = encodeApprove({
      nullifier: '0x' + 'ff'.repeat(32),
      amount: 500n,
      recipient: '0x0000000000000000000000000000000000000002',
    });
    expect(data).toMatch(/^0x[0-9a-f]{8,}$/);
  });
});
