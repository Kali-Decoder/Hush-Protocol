// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct TeeInstructionParams {
    bytes32 opType;
    bytes32 opCommand;
    bytes message;
    address[] cosigners;
    uint64 cosignersThreshold;
    address claimBackAddress;
}

interface ITeeExtensionRegistry {
    function sendInstructions(
        address[] memory teeIds,
        TeeInstructionParams memory params
    ) external payable returns (uint256 _instructionId);

    function extensionsCounter() external view returns (uint256);
    function getTeeExtensionInstructionsSender(uint256 extensionId) external view returns (address);
}
