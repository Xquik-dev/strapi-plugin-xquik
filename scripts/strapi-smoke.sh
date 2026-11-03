#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work="$(mktemp -d)"
server=""
cleanup() {
    if [[ -n "$server" ]]; then
        kill "$server" 2>/dev/null || true
        wait "$server" || true
    fi
    rm -rf "$work"
}
trap cleanup EXIT

export STRAPI_TELEMETRY_DISABLED=true

(cd "$repo" && npm pack --pack-destination "$work")
cd "$work"
npx --yes create-strapi-app@5.60.0 app --js --no-run --skip-cloud --skip-db \
    --no-example --no-git-init --use-npm --install --non-interactive
cd app
npm install --no-audit --no-fund "$work"/strapi-plugin-xquik-*.tgz
cp -R "$repo/scripts/strapi-smoke-api" src/api/xquik-smoke

node --version
npm ls @strapi/strapi strapi-plugin-xquik --depth=0

./node_modules/.bin/strapi build
port="$(node -e 'const server = require("node:net").createServer().listen(0, "127.0.0.1", () => { console.log(server.address().port); server.close(); })')"
HOST=127.0.0.1 PORT="$port" ./node_modules/.bin/strapi start >"$work/server.log" 2>&1 &
server=$!

if ! node "$repo/scripts/strapi-smoke.mjs" "http://127.0.0.1:$port"; then
    tail -n 80 "$work/server.log" >&2
    exit 1
fi
