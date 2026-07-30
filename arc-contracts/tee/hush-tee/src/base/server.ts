import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { ExtensionCallRequest, ExtensionCallResponse } from '../app/types.js';
import type { HealthCheckResult, ExtensionInfo } from './types.js';

interface RouteHandler {
  (req: IncomingMessage, body: unknown): Promise<Record<string, unknown>> | Record<string, unknown>;
}

export class ExtensionServer {
  private readonly server;
  private readonly info: ExtensionInfo;
  private readonly routes = new Map<string, RouteHandler>();
  private startTime = Date.now();

  constructor(info: ExtensionInfo) {
    this.info = info;
    this.server = createServer((req, res) => this.handleRequest(req, res));
  }

  registerMethod(opType: string, opCommand: string, handler: RouteHandler): void {
    const key = `${opType}/${opCommand}`;
    this.routes.set(key, handler);
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        const result: HealthCheckResult = {
          status: 'ok',
          uptime: (Date.now() - this.startTime) / 1000,
          extension: this.info,
        };
        this.jsonResponse(res, 200, result);
        return;
      }

      if (req.method === 'GET' && req.url === '/info') {
        this.jsonResponse(res, 200, { methodCount: this.routes.size, ...this.info });
        return;
      }

      if (req.method === 'POST' && req.url === '/extension_call') {
        const body = await this.readBody(req);
        const callReq = body as ExtensionCallRequest;
        const key = `${callReq.op_type}/${callReq.op_command}`;
        const handler = this.routes.get(key);
        if (!handler) {
          this.jsonResponse(res, 400, { success: false, error: `Unsupported: ${key}` });
          return;
        }
        const result = await handler(req, body);
        this.jsonResponse(res, 200, result);
        return;
      }

      this.jsonResponse(res, 404, { success: false, error: 'Not found' });
    } catch (err) {
      this.jsonResponse(res, 500, { success: false, error: String(err) });
    }
  }

  private readBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  private jsonResponse(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  listen(port: number): void {
    this.server.listen(port, () => {
      console.log(`Extension server listening on port ${port}`);
    });
  }
}
