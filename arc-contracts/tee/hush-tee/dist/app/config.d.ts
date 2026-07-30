export declare const OP_TYPE_HUSH: "HUSH";
export declare const OP_COMMAND_DERIVE_NULLIFIER: "DERIVE_NULLIFIER";
export declare const OP_COMMAND_SET_LIMIT: "SET_LIMIT";
export declare const OP_COMMAND_APPROVE_WITHDRAWAL: "APPROVE_WITHDRAWAL";
export declare const OP_COMMAND_GET_STATE: "GET_STATE";
export declare const OP_COMMANDS_HUSH: readonly ["DERIVE_NULLIFIER", "SET_LIMIT", "APPROVE_WITHDRAWAL", "GET_STATE"];
export type HushOpCommand = (typeof OP_COMMANDS_HUSH)[number];
export declare const DERIVE_PREFIX = "hush-derive-v1";
export declare const COMMITMENT_PREFIX = "hush-commitment-v1";
export declare const APPROVE_PREFIX = "hush-approve-v1";
//# sourceMappingURL=config.d.ts.map