import { type IncomingMessage } from 'node:http';
import type { ExtensionInfo } from './types.js';
interface RouteHandler {
    (req: IncomingMessage, body: unknown): Promise<Record<string, unknown>> | Record<string, unknown>;
}
export declare class ExtensionServer {
    private readonly server;
    private readonly info;
    private readonly routes;
    private startTime;
    constructor(info: ExtensionInfo);
    registerMethod(opType: string, opCommand: string, handler: RouteHandler): void;
    private handleRequest;
    private readBody;
    private jsonResponse;
    listen(port: number): void;
}
export {};
//# sourceMappingURL=server.d.ts.map