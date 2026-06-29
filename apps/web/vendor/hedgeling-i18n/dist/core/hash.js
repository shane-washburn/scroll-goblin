import crypto from "node:crypto";
// Whitespace normalization MUST match the MCP server (packages/mcp-server/src/hash.ts)
// so that keys produced by extraction line up with keys produced during processing.
export function normalizeWhitespace(input) {
    return input.replace(/\s+/g, " ");
}
export function canonicalizeSourceText(text) {
    return normalizeWhitespace(text).trim();
}
export function md5Hex(input) {
    return crypto.createHash("md5").update(input, "utf8").digest("hex");
}
export function keyFor(text) {
    return md5Hex(canonicalizeSourceText(text));
}
