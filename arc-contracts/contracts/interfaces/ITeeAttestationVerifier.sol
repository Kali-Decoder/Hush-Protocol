// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct TeeAttestation {
    address userAddress;
    bytes32 nullifier;
    uint256 nonce;
}

interface ITeeAttestationVerifier {
    function verifyAttestation(
        TeeAttestation calldata att,
        bytes calldata signature
    ) external view returns (bool);
}
