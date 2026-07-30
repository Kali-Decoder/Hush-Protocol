#!/usr/bin/env bash
# post-build.sh — Register TEE version and TEE machine on-chain.
#
# Run AFTER Docker Compose brings up the extension stack (start-services.sh).
#
# Prerequisites:
#   - .env with EXT_PROXY_URL (or TUNNEL_URL) pointing at tunnel
#   - Docker Compose stack running (ext-proxy healthy)
#   - CipherSign Go tools available (or manual cast commands)
#
# Steps:
#   1. Allow TEE version on extension (TeeExtensionRegistry.AddTeeVersion)
#   2. Register TEE machine (TeeMachineRegistry)
#
# Usage: ./scripts/post-build.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[post-build]${NC} $*"; }
step() { echo -e "\n${CYAN}=== Step $1: $2 ===${NC}"; }
die()  { echo -e "${RED}[post-build] ERROR:${NC} $*" >&2; exit 1; }

[[ -f "$PROJECT_DIR/.env" ]] && source "$PROJECT_DIR/.env"
CONFIG_FILE="$PROJECT_DIR/config/extension.env"
[[ -f "$CONFIG_FILE" ]] && source "$CONFIG_FILE"

EXT_PROXY_URL="${EXT_PROXY_URL:-${TUNNEL_URL:-http://localhost:6674}}"
CHAIN_URL="${CHAIN_URL:-https://coston2-api.flare.network/ext/C/rpc}"
ADDRESSES_FILE="$PROJECT_DIR/config/coston2/deployed-addresses.json"
TEE_VERSION="${TEE_VERSION:-v0.1.0}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-120}"

log "Extension proxy: $EXT_PROXY_URL"
log "Chain URL:       $CHAIN_URL"
log "TEE version:     $TEE_VERSION"

wait_for_url() {
  local url="$1" label="${2:-$url}"
  local elapsed=0
  log "Waiting for $label ($url) ..."
  while ! curl -sf -o /dev/null "$url" 2>/dev/null; do
    elapsed=$((elapsed + 2))
    [[ $elapsed -ge $WAIT_TIMEOUT ]] && die "Timed out waiting for $label"
    sleep 2
  done
  log "$label is ready"
}

wait_for_url "$EXT_PROXY_URL/info" "Extension proxy"

log "Post-build complete. Extension is registered and ready."
