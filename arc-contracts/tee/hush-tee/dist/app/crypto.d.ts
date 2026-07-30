import type { NullifierPolicy } from './types.js';
export declare function deriveNullifierSecret(user: string, policyId: string): string;
export declare function deriveCommitment(nullifier: string, amount: bigint, recipient: string): string;
export declare function hashAttestation(attestation: {
    opType: string;
    opCommand: string;
    payloadHash: string;
    timestamp: number;
    nonce: number;
}): string;
export declare function serializePolicy(policy: NullifierPolicy): string;
//# sourceMappingURL=crypto.d.ts.map