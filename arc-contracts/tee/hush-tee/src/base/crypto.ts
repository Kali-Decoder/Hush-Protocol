import { ethers } from 'ethers';

export function recoverSigner(digest: string, signature: string): string {
  return ethers.verifyMessage(ethers.getBytes(digest), signature);
}

export function isValidSignature(
  digest: string,
  signature: string,
  expectedSigner: string,
): boolean {
  try {
    const recovered = recoverSigner(digest, signature);
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  } catch {
    return false;
  }
}
