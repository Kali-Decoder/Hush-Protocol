import { describe, it, expect } from 'vitest';
import { deriveNullifierSecret, deriveCommitment, hashAttestation } from '../app/crypto.js';

const USER_A = '0x0000000000000000000000000000000000000001';
const USER_B = '0x0000000000000000000000000000000000000002';
const POLICY_ID = '0x0000000000000000000000000000000000000000000000000000000000000001';
const NULLIFIER = '0x1111111111111111111111111111111111111111111111111111111111111111';
const RECIPIENT = '0x0000000000000000000000000000000000000003';

describe('deriveNullifierSecret', () => {
  it('produces consistent output for same inputs', () => {
    const a = deriveNullifierSecret(USER_A, POLICY_ID);
    const b = deriveNullifierSecret(USER_A, POLICY_ID);
    expect(a).toBe(b);
  });

  it('produces different output for different users', () => {
    const a = deriveNullifierSecret(USER_A, POLICY_ID);
    const b = deriveNullifierSecret(USER_B, POLICY_ID);
    expect(a).not.toBe(b);
  });
});

describe('deriveCommitment', () => {
  it('produces a 66-char hex string', () => {
    const result = deriveCommitment(NULLIFIER, 100n, RECIPIENT);
    expect(result).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe('hashAttestation', () => {
  it('produces consistent hashes for same input', () => {
    const a = hashAttestation({ opType: 'HUSH', opCommand: 'APPROVE', payloadHash: NULLIFIER, timestamp: 100, nonce: 1 });
    const b = hashAttestation({ opType: 'HUSH', opCommand: 'APPROVE', payloadHash: NULLIFIER, timestamp: 100, nonce: 1 });
    expect(a).toBe(b);
  });
});
