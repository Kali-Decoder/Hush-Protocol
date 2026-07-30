import { ethers } from 'ethers';
import { deriveNullifierSecret, hashAttestation } from './crypto.js';
import { OP_COMMAND_DERIVE_NULLIFIER, OP_COMMAND_SET_LIMIT, OP_COMMAND_APPROVE_WITHDRAWAL } from './config.js';
export function handleDeriveNullifier(req) {
    const payload = req.payload;
    if (!payload.user) {
        return { success: false, error: 'Missing user' };
    }
    const policyId = ethers.hexlify(ethers.randomBytes(32));
    const nullifier = deriveNullifierSecret(payload.user, policyId);
    const data = {
        nullifier,
        commitment: nullifier,
        policyId,
    };
    return { success: true, data: data };
}
export function handleSetLimit(req) {
    const payload = req.payload;
    if (!payload.user || !payload.policyId) {
        return { success: false, error: 'Missing user or policyId' };
    }
    const data = {
        policyId: payload.policyId,
        commitmentRoot: ethers.ZeroHash,
    };
    return { success: true, data: data };
}
export function handleApproveWithdrawal(req) {
    const payload = req.payload;
    if (!payload.user || !payload.nullifier) {
        return { success: false, error: 'Missing user or nullifier' };
    }
    const payloadHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(payload)));
    const digest = hashAttestation({
        opType: req.op_type,
        opCommand: req.op_command,
        payloadHash,
        timestamp: Math.floor(Date.now() / 1000),
        nonce: Math.floor(Math.random() * 2 ** 32),
    });
    const data = {
        approval: digest,
        nullifier: payload.nullifier,
    };
    return { success: true, data: data };
}
export function dispatchRequest(req) {
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
//# sourceMappingURL=handlers.js.map