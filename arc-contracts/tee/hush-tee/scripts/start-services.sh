#!/usr/bin/env bash
# start-services.sh — Start Docker Compose stack for hush-tee.
#
# Prerequisites:
#   - config/extension.env from pre-build.sh
#   - .env with PRIVATE_KEY, INITIAL_OWNER
#   - config/proxy/extension_proxy.toml with indexer DB credentials
#   - Tunnel to :6674 (cloudflared/ngrok)
#     cloudflared tunnel --url http://localhost:6674
#
# Usage: ./scripts/start-services.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log() { echo -e "${GREEN}[start-services]${NC} $*"; }
die() { echo -e "${RED}[start-services] ERROR:${NC} $*" >&2; exit 1; }

[[ -f "$PROJECT_DIR/.env" ]] && source "$PROJECT_DIR/.env"
CONFIG_FILE="$PROJECT_DIR/config/extension.env"
if [[ -f "$CONFIG_FILE" ]]; then
  source "$CONFIG_FILE"
  log "Loaded config from $CONFIG_FILE"
fi

EXTENSION_ID="${EXTENSION_ID:-}"
[[ -n "$EXTENSION_ID" ]] || die "EXTENSION_ID not set. Run pre-build.sh first."

EXT_PROXY_URL="${EXT_PROXY_URL:-${TUNNEL_URL:-}}"
LOCAL_PROXY_URL="${LOCAL_PROXY_URL:-http://localhost:6674}"

[[ -f "$PROJECT_DIR/config/proxy/extension_proxy.toml" ]] \
  || die "Missing config/proxy/extension_proxy.toml — copy from example and fill [db]."

LOCAL_MODE="${LOCAL_MODE:-false}"
SIMULATED_TEE="${SIMULATED_TEE:-true}"
log "Extension ID:    $EXTENSION_ID"
log "LOCAL_MODE:      $LOCAL_MODE"
log "SIMULATED_TEE:   $SIMULATED_TEE"
log "Local proxy:     $LOCAL_PROXY_URL"
log "Public proxy:    ${EXT_PROXY_URL:-(not set)}"

cd "$PROJECT_DIR"
docker compose up -d --build || die "docker compose up failed"

log "Waiting for local extension proxy at $LOCAL_PROXY_URL/info ..."
elapsed=0
timeout=180
while ! curl -sf -o /dev/null "$LOCAL_PROXY_URL/info" 2>/dev/null; do
  elapsed=$((elapsed + 2))
  if [[ $elapsed -ge $timeout ]]; then
    die "Timed out waiting for extension proxy"
  fi
  sleep 2
done
log "Extension proxy is ready."
log "Start services complete."
