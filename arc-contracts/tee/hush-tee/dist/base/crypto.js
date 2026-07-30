import { ethers } from 'ethers';
export function recoverSigner(digest, signature) {
    return ethers.verifyMessage(ethers.getBytes(digest), signature);
}
export function isValidSignature(digest, signature, expectedSigner) {
    try {
        const recovered = recoverSigner(digest, signature);
        return recovered.toLowerCase() === expectedSigner.toLowerCase();
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=crypto.js.map