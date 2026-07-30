// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ITeeAttestationVerifier, TeeAttestation} from "./interfaces/ITeeAttestationVerifier.sol";

contract TeeAttestationVerifier is ITeeAttestationVerifier, Ownable2Step {
    address public teePublicKey;
    mapping(uint256 => bool) public usedNonces;

    error NoTeePublicKey();
    error NonceAlreadyUsed();
    error InvalidSignature();

    event TeePublicKeyUpdated(address indexed previous, address indexed current);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setTeePublicKey(address key) external onlyOwner {
        if (key == address(0)) revert NoTeePublicKey();
        address previous = teePublicKey;
        teePublicKey = key;
        emit TeePublicKeyUpdated(previous, key);
    }

    function verifyAttestation(
        TeeAttestation calldata att,
        bytes calldata signature
    ) external view returns (bool) {
        if (teePublicKey == address(0)) revert NoTeePublicKey();
        if (usedNonces[att.nonce]) revert NonceAlreadyUsed();

        bytes32 messageHash = keccak256(abi.encode(att));
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = _splitSignature(signature);
        address recovered = ecrecover(ethSignedHash, v, r, s);
        if (recovered != teePublicKey) revert InvalidSignature();

        return true;
    }

    function _splitSignature(bytes calldata sig) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        if (sig.length != 65) revert InvalidSignature();
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
    }
}
