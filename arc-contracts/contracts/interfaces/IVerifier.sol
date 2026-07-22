// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IVerifier
/// @notice ZK proof verifier used by BulletPool on withdraw.
/// @dev Milestone 3 uses a mock that always returns true. Replace with a
///      Groth16 verifier once the Circom circuit is locked.
interface IVerifier {
    /// @notice Verify a withdrawal proof.
    /// @param proof Opaque proof bytes (encoding defined by the concrete verifier).
    /// @param root Merkle root the note membership is proven against.
    /// @param nullifier Nullifier derived from the note secret.
    /// @param recipient Payout address bound by the proof (once real ZK lands).
    /// @param token ERC-20 being withdrawn (bound once real ZK lands).
    /// @param amount Stroop/wei amount being withdrawn (bound once real ZK lands).
    /// @return True if the proof is valid.
    function verifyProof(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifier,
        address recipient,
        address token,
        uint256 amount
    ) external view returns (bool);
}
