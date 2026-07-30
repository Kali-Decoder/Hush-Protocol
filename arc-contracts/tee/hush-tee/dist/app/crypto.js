import { ethers } from 'ethers';
import { DERIVE_PREFIX, COMMITMENT_PREFIX, APPROVE_PREFIX } from './config.js';
export function deriveNullifierSecret(user, policyId) {
    const packed = ethers.solidityPacked(['bytes32', 'address', 'bytes32'], [ethers.id(DERIVE_PREFIX), user, policyId]);
    return ethers.keccak256(packed);
}
export function deriveCommitment(nullifier, amount, recipient) {
    const packed = ethers.solidityPacked(['bytes32', 'bytes32', 'uint256', 'address'], [ethers.id(COMMITMENT_PREFIX), nullifier, amount, recipient]);
    return ethers.keccak256(packed);
}
export function hashAttestation(attestation) {
    return ethers.solidityPackedKeccak256(['bytes32', 'string', 'string', 'bytes32', 'uint256', 'uint256'], [
        ethers.id(APPROVE_PREFIX),
        attestation.opType,
        attestation.opCommand,
        attestation.payloadHash,
        attestation.timestamp,
        attestation.nonce,
    ]);
}
export function serializePolicy(policy) {
    return ethers.AbiCoder.defaultAbiCoder().encode(['address', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256'], [policy.user, policy.policyId, policy.minInterval, policy.maxAmount, policy.validFrom, policy.validTo]);
}
//# sourceMappingURL=crypto.js.map