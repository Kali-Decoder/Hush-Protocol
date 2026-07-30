import { describe, it, expect } from 'vitest';
import { hexToBytes, bytesToHex, utf8ToHex } from '../base/encoding.js';

describe('hexToBytes / bytesToHex', () => {
  it('roundtrips', () => {
    const hex = '0xdeadbeef';
    expect(bytesToHex(hexToBytes(hex))).toBe(hex);
  });

  it('handles empty hex', () => {
    expect(bytesToHex(hexToBytes('0x'))).toBe('0x');
  });
});

describe('utf8ToHex', () => {
  it('encodes a string', () => {
    const hex = utf8ToHex('hello');
    expect(hex).toBe('0x68656c6c6f');
  });
});
