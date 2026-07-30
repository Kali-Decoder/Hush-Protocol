import { createServer } from 'node:http';
export class ExtensionServer {
    server;
    info;
    routes = new Map();
    startTime = Date.now();
    constructor(info) {
        this.info = info;
        this.server = createServer((req, res) => this.handleRequest(req, res));
    }
    registerMethod(opType, opCommand, handler) {
        const key = `${opType}/${opCommand}`;
        this.routes.set(key, handler);
    }
    async handleRequest(req, res) {
        try {
            if (req.method === 'GET' && req.url === '/health') {
                const result = {
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
                const callReq = body;
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
        }
        catch (err) {
            this.jsonResponse(res, 500, { success: false, error: String(err) });
        }
    }
    readBody(req) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => {
                try {
                    resolve(JSON.parse(Buffer.concat(chunks).toString()));
                }
                catch (e) {
                    reject(new Error('Invalid JSON'));
                }
            });
            req.on('error', reject);
        });
    }
    jsonResponse(res, status, data) {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }
    listen(port) {
        this.server.listen(port, () => {
            console.log(`Extension server listening on port ${port}`);
        });
    }
}
//# sourceMappingURL=server.js.map