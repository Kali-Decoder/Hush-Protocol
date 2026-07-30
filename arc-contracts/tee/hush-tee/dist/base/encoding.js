export function hexToBytes(hex) {
    const h = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(h.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}
export function bytesToHex(bytes) {
    return '0x' + Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
export function utf8ToHex(text) {
    const encoder = new TextEncoder();
    return bytesToHex(encoder.encode(text));
}
//# sourceMappingURL=encoding.js.map