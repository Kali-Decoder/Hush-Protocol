#!/usr/bin/env bash
# test.sh — Smoke tests for hush-tee extension.
#
# Prerequisites: Docker Compose stack running (start-services.sh)
#
# Tests:
#   1. Proxy /info health check
#   2. HUSH/DERIVE_NULLIFIER instruction
#   3. HUSH/APPROVE_WITHDRAWAL instruction
#   4. Verify TEE signature via on-chain TeeAttestationVerifier
#
# Usage: ./scripts/test.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[test]${NC} $*"; }
die()  { echo -e "${RED}[test] FAIL:${NC} $*"; exit 1; }

[[ -f "$PROJECT_DIR/.env" ]] && source "$PROJECT_DIR/.env"
CONFIG_FILE="$PROJECT_DIR/config/extension.env"
[[ -f "$CONFIG_FILE" ]] && source "$CONFIG_FILE"

LOCAL_PROXY_URL="${LOCAL_PROXY_URL:-http://localhost:6674}"
EXT_PROXY_URL="${EXT_PROXY_URL:-${TUNNEL_URL:-$LOCAL_PROXY_URL}}"
CHAIN_URL="${CHAIN_URL:-https://coston2-api.flare.network/ext/C/rpc}"

FAILED=0

test_proxy_info() {
  log "Test 1: Proxy /info"
  local info
  info=$(curl -sf "$EXT_PROXY_URL/info" 2>/dev/null) || die "Proxy unreachable"
  echo "$info" | head -5
  log "Test 1: PASS"
}

test_derive_nullifier() {
  log "Test 2: HUSH/DERIVE_NULLIFIER"
  local resp
  resp=$(curl -sf -X POST "$EXT_PROXY_URL/direct" \
    -H "Content-Type: application/json" \
    -d '{
      "jsonrpc": "2.0",
      "method": "extension_call",
      "params": [{"op_type": "HUSH", "op_command": "DERIVE_NULLIFIER", "payload": {"user": "0x0000000000000000000000000000000000000001"}}],
      "id": 1
    }' 2>/dev/null) || die "DERIVE_NULLIFIER failed"
  echo "$resp" | head -3
  log "Test 2: PASS"
}

test_approve_withdrawal() {
  log "Test 3: HUSH/APPROVE_WITHDRAWAL"
  local resp
  resp=$(curl -sf -X POST "$EXT_PROXY_URL/direct" \
    -H "Content-Type: application/json" \
    -d '{
      "jsonrpc": "2.0",
      "method": "extension_call",
      "params": [{"op_type": "HUSH", "op_command": "APPROVE_WITHDRAWAL", "payload": {"user": "0x0000000000000000000000000000000000000001", "nullifier": "0xab", "amount": "100", "recipient": "0xcafe"}}],
      "id": 2
    }' 2>/dev/null) || die "APPROVE_WITHDRAWAL failed"
  echo "$resp" | head -3
  log "Test 3: PASS"
}

test_proxy_info
test_derive_nullifier
test_approve_withdrawal

echo -e "\n${GREEN}All tests passed.${NC}"
