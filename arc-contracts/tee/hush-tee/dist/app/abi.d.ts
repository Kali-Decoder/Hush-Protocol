export interface DeriveParams {
    user: string;
    policyId: string;
    minInterval: bigint;
    maxAmount: bigint;
    validFrom: bigint;
    validTo: bigint;
}
export interface ApproveParams {
    nullifier: string;
    amount: bigint;
    recipient: string;
}
export declare function encodeDerive(params: DeriveParams): string;
export declare function encodeApprove(params: ApproveParams): string;
export declare function decodeDeriveResult(data: string): {
    nullifier: string;
    commitment: string;
};
export declare function decodeApproveResult(data: string): {
    approval: string;
};
//# sourceMappingURL=abi.d.ts.map