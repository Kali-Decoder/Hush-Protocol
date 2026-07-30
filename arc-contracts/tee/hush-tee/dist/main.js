import { ExtensionServer } from './base/server.js';
import { dispatchRequest } from './app/handlers.js';
import { OP_TYPE_HUSH, OP_COMMANDS_HUSH } from './app/config.js';
const port = parseInt(process.env.EXTENSION_PORT || '8883', 10);
const server = new ExtensionServer({
    name: 'hush-tee-extension',
    version: '0.1.0',
    supportedMethods: OP_COMMANDS_HUSH.map(cmd => ({ op_type: OP_TYPE_HUSH, op_command: cmd })),
});
for (const cmd of OP_COMMANDS_HUSH) {
    server.registerMethod(OP_TYPE_HUSH, cmd, async (_req, body) => {
        const result = dispatchRequest(body);
        return result;
    });
}
server.listen(port);
//# sourceMappingURL=main.js.map