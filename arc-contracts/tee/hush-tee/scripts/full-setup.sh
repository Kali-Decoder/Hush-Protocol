#!/usr/bin/env bash
# full-setup.sh — Run complete hush-tee lifecycle:
#   pre-build → start-services → post-build
#
# Prerequisites:
#   - .env with PRIVATE_KEY, INITIAL_OWNER, CHAIN_URL
#   - config/proxy/extension_proxy.toml from example + indexer [db]
#   - Tunnel already running (cloudflared/ngrok to localhost:6674)
#
# Usage:
#   ./scripts/full-setup.sh              # setup only
#   ./scripts/full-setup.sh --test       # + run smoke tests
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[full-setup]${NC} $*"; }
die()  { echo -e "${RED}[full-setup] ERROR:${NC} $*" >&2; exit 1; }

RUN_TESTS=false
FORCE_PREBUILD=""
for arg in "$@"; do
  case "$arg" in
    --test) RUN_TESTS=true ;;
    --force) FORCE_PREBUILD="--force" ;;
    *) die "Unknown argument: $arg" ;;
  esac
done

echo -e "\n${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Phase 1: Pre-build                  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
"$SCRIPT_DIR/pre-build.sh" $FORCE_PREBUILD || die "Pre-build failed"

echo -e "\n${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Phase 2: Start services             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
"$SCRIPT_DIR/start-services.sh" || die "Start services failed"

echo -e "\n${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Phase 3: Post-build                 ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
"$SCRIPT_DIR/post-build.sh" || die "Post-build failed"

if [[ "$RUN_TESTS" == "true" ]]; then
  echo -e "\n${CYAN}╔══════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║  Phase 4: Smoke tests                ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
  "$SCRIPT_DIR/test.sh" || die "Smoke tests failed"
fi

echo -e "\n${GREEN}Full setup complete.${NC}"
