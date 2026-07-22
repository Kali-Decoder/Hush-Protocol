// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IVerifier} from "./interfaces/IVerifier.sol";
import {IMerkleRootManager} from "./interfaces/IMerkleRootManager.sol";

/// @title BulletPool
/// @notice ZK-private payment pool: deposit notes, withdraw with membership proofs.
/// @dev Option B — Merkle tree is off-chain. This contract holds ERC-20 balances,
///      tracks spent nullifiers, and accepts proofs against roots in MerkleRootManager.
///      Token registry is embedded (enable/disable supported ERC-20s).
///
///      Deposit events expose commitment + leafIndex for the indexer. Withdrawal
///      events omit the commitment so deposit↔withdraw are unlinkable on-chain
///      (subject to anonymity-set size and amount matching).
contract BulletPool is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    struct TokenInfo {
        /// @dev True once `addToken` has been called; never cleared on remove.
        ///      Lets withdraw succeed after `removeToken` (no stranded funds).
        bool registered;
        /// @dev True while new deposits are accepted.
        bool enabled;
        uint8 decimals;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────────

    IVerifier public verifier;
    IMerkleRootManager public rootManager;

    /// @notice Supported ERC-20 registry (embedded).
    mapping(address => TokenInfo) public supportedTokens;

    /// @notice Spent nullifiers. True = already withdrawn.
    mapping(bytes32 => bool) public nullifierSpent;

    /// @notice Next leaf index assigned on deposit (also total deposits).
    uint32 public depositCounter;

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error InvalidToken();
    error InvalidAmount();
    error InvalidCommitment();
    error InvalidRecipient();
    error InvalidProof();
    error RootNotFound();
    error NullifierAlreadyUsed();
    error ZeroAddress();
    error TokenAlreadySupported();
    error TokenNotSupported();

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event Deposit(
        bytes32 indexed commitment,
        uint32 indexed leafIndex,
        address indexed token,
        uint256 amount
    );

    /// @dev No commitment — keeps deposit↔withdraw unlinkable on-chain.
    event Withdrawal(bytes32 indexed nullifier, address indexed recipient);

    event TokenAdded(address indexed token, uint8 decimals);
    event TokenRemoved(address indexed token);
    event VerifierUpdated(address indexed previous, address indexed current);
    event RootManagerUpdated(address indexed previous, address indexed current);

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(
        address initialOwner,
        address verifier_,
        address rootManager_
    ) Ownable(initialOwner) {
        if (verifier_ == address(0) || rootManager_ == address(0)) revert ZeroAddress();
        verifier = IVerifier(verifier_);
        rootManager = IMerkleRootManager(rootManager_);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Token registry (embedded)
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Enable an ERC-20 for deposits.
    /// @param token ERC-20 address.
    /// @param decimals_ Decimals recorded for integrators / UI (not enforced on-chain).
    function addToken(address token, uint8 decimals_) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        TokenInfo storage info = supportedTokens[token];
        if (info.enabled) revert TokenAlreadySupported();

        info.registered = true;
        info.enabled = true;
        info.decimals = decimals_;
        emit TokenAdded(token, decimals_);
    }

    /// @notice Disable new deposits for `token`. Existing pool balance stays withdrawable.
    function removeToken(address token) external onlyOwner {
        TokenInfo storage info = supportedTokens[token];
        if (!info.enabled) revert TokenNotSupported();
        info.enabled = false;
        emit TokenRemoved(token);
    }

    /// @notice Whether `token` is currently accepted for new deposits.
    function isSupported(address token) external view returns (bool) {
        return supportedTokens[token].enabled;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Deposit
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Deposit `amount` of `token` under `commitment`.
    /// @dev Commitment is not stored on-chain — only emitted for the off-chain indexer.
    ///      Caller must have approved this contract for at least `amount`.
    /// @return leafIndex Index assigned to this deposit (for Merkle leaf ordering).
    function deposit(
        address token,
        uint256 amount,
        bytes32 commitment
    ) external nonReentrant whenNotPaused returns (uint32 leafIndex) {
        if (!supportedTokens[token].enabled) revert InvalidToken();
        if (amount == 0) revert InvalidAmount();
        if (commitment == bytes32(0)) revert InvalidCommitment();

        leafIndex = depositCounter;
        unchecked {
            depositCounter = leafIndex + 1;
        }

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit Deposit(commitment, leafIndex, token, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Withdraw
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Withdraw a note by proving membership under a known root.
    /// @dev Checks-effects-interactions: nullifier marked spent before transfer.
    ///      With the mock verifier, `proof` may be empty. A real Groth16 verifier
    ///      must bind {root, nullifier, recipient, token, amount} as public inputs.
    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifier,
        address recipient,
        address token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (nullifier == bytes32(0)) revert InvalidProof();
        if (!supportedTokens[token].registered) revert InvalidToken();
        if (!rootManager.isKnownRoot(root)) revert RootNotFound();
        if (nullifierSpent[nullifier]) revert NullifierAlreadyUsed();

        if (!verifier.verifyProof(proof, root, nullifier, recipient, token, amount)) {
            revert InvalidProof();
        }

        nullifierSpent[nullifier] = true;

        IERC20(token).safeTransfer(recipient, amount);

        emit Withdrawal(nullifier, recipient);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setVerifier(address verifier_) external onlyOwner {
        if (verifier_ == address(0)) revert ZeroAddress();
        address previous = address(verifier);
        verifier = IVerifier(verifier_);
        emit VerifierUpdated(previous, verifier_);
    }

    function setRootManager(address rootManager_) external onlyOwner {
        if (rootManager_ == address(0)) revert ZeroAddress();
        address previous = address(rootManager);
        rootManager = IMerkleRootManager(rootManager_);
        emit RootManagerUpdated(previous, rootManager_);
    }
}
