// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ITeeExtensionRegistry, TeeInstructionParams} from "./interfaces/ITeeExtensionRegistry.sol";
import {ITeeMachineRegistry} from "./interfaces/ITeeMachineRegistry.sol";

contract InstructionSender {
    ITeeExtensionRegistry public immutable teeExtensionRegistry;
    ITeeMachineRegistry public immutable teeMachineRegistry;

    bytes32 public constant OP_TYPE_HUSH = keccak256("HUSH");
    bytes32 public constant CMD_DERIVE_NULLIFIER = keccak256("DERIVE_NULLIFIER");
    bytes32 public constant CMD_SET_LIMIT = keccak256("SET_LIMIT");
    bytes32 public constant CMD_APPROVE_WITHDRAWAL = keccak256("APPROVE_WITHDRAWAL");

    error EmptyTeeIds();

    event InstructionSent(uint256 indexed instructionId, bytes32 indexed opCommand, address indexed user);

    constructor(address teeExtensionRegistry_, address teeMachineRegistry_) {
        teeExtensionRegistry = ITeeExtensionRegistry(teeExtensionRegistry_);
        teeMachineRegistry = ITeeMachineRegistry(teeMachineRegistry_);
    }

    function sendDeriveNullifier(
        bytes calldata payload,
        address[] calldata cosigners,
        uint64 cosignersThreshold,
        address claimBackAddress
    ) external payable returns (uint256) {
        return _sendInstruction(CMD_DERIVE_NULLIFIER, payload, cosigners, cosignersThreshold, claimBackAddress);
    }

    function sendSetLimit(
        bytes calldata payload,
        address[] calldata cosigners,
        uint64 cosignersThreshold,
        address claimBackAddress
    ) external payable returns (uint256) {
        return _sendInstruction(CMD_SET_LIMIT, payload, cosigners, cosignersThreshold, claimBackAddress);
    }

    function sendApproveWithdrawal(
        bytes calldata payload,
        address[] calldata cosigners,
        uint64 cosignersThreshold,
        address claimBackAddress
    ) external payable returns (uint256) {
        return _sendInstruction(CMD_APPROVE_WITHDRAWAL, payload, cosigners, cosignersThreshold, claimBackAddress);
    }

    function _sendInstruction(
        bytes32 opCommand,
        bytes calldata payload,
        address[] calldata cosigners,
        uint64 cosignersThreshold,
        address claimBackAddress
    ) internal returns (uint256) {
        uint256 extensionId = teeExtensionRegistry.extensionsCounter();
        address[] memory teeIds = teeMachineRegistry.getRandomTeeIds(extensionId, 1);
        if (teeIds.length == 0) revert EmptyTeeIds();

        address sender = teeExtensionRegistry.getTeeExtensionInstructionsSender(extensionId);
        if (sender != address(this)) revert("InstructionSender: not registered");

        TeeInstructionParams memory params = TeeInstructionParams({
            opType: OP_TYPE_HUSH,
            opCommand: opCommand,
            message: payload,
            cosigners: cosigners,
            cosignersThreshold: cosignersThreshold,
            claimBackAddress: claimBackAddress
        });

        uint256 instructionId = teeExtensionRegistry.sendInstructions{value: msg.value}(teeIds, params);

        emit InstructionSent(instructionId, opCommand, address(uint160(uint256(keccak256(payload)))));
        return instructionId;
    }
}
