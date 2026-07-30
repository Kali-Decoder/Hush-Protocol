export const OP_TYPE_HUSH = 'HUSH' as const;

export const OP_COMMAND_DERIVE_NULLIFIER = 'DERIVE_NULLIFIER' as const;
export const OP_COMMAND_SET_LIMIT = 'SET_LIMIT' as const;
export const OP_COMMAND_APPROVE_WITHDRAWAL = 'APPROVE_WITHDRAWAL' as const;
export const OP_COMMAND_GET_STATE = 'GET_STATE' as const;

export const OP_COMMANDS_HUSH = [
  OP_COMMAND_DERIVE_NULLIFIER,
  OP_COMMAND_SET_LIMIT,
  OP_COMMAND_APPROVE_WITHDRAWAL,
  OP_COMMAND_GET_STATE,
] as const;

export type HushOpCommand = (typeof OP_COMMANDS_HUSH)[number];

export const DERIVE_PREFIX = 'hush-derive-v1';
export const COMMITMENT_PREFIX = 'hush-commitment-v1';
export const APPROVE_PREFIX = 'hush-approve-v1';
