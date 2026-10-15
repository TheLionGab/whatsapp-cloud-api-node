#!/bin/bash
# Teste local ponta a ponta (modo DRY_RUN, sem conta Meta).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build >/dev/null
PORT="${PORT:-3001}" DRY_RUN=true WHATSAPP_VERIFY_TOKEN="${WHATSAPP_VERIFY_TOKEN:-teste-local-123}" node dist/index.js &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do
  curl -sf "http://localhost:${PORT:-3001}/health" >/dev/null 2>&1 && break
  sleep 0.5
done
echo "== GET /health"
curl -s "http://localhost:${PORT:-3001}/health"; echo
echo "== GET /webhook (verify)"
curl -s "http://localhost:${PORT:-3001}/webhook?hub.mode=subscribe&hub.verify_token=${WHATSAPP_VERIFY_TOKEN:-teste-local-123}&hub.challenge=teste123"; echo
echo "== POST /webhook"
curl -s -X POST "http://localhost:${PORT:-3001}/webhook" -H 'Content-Type: application/json' -d '{"object":"whatsapp_business_account"}'; echo
echo "== POST /messages/text (dry-run)"
curl -s -X POST "http://localhost:${PORT:-3001}/messages/text" -H 'Content-Type: application/json' -d '{"to":"5565999990000","body":"teste local"}'; echo
