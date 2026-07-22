// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVerifier} from "./interfaces/IVerifier.sol";

/// @title BulletVerifier
/// @notice Temporary mock verifier. Always returns true.
/// @dev Replace this contract (or swap via BulletPool.setVerifier) with a real
///      Groth16 verifier after the Circom claim circuit is stable. Do not deploy
///      this mock on a network with real funds.
contract BulletVerifier is IVerifier {
    /// @inheritdoc IVerifier
    function verifyProof(
        bytes calldata /* proof */,
        bytes32 /* root */,
        bytes32 /* nullifier */,
        address /* recipient */,
        address /* token */,
        uint256 /* amount */
    ) external pure returns (bool) {
        return true;
    }
}
