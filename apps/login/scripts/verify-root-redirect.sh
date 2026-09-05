#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$script_dir/.."

test_port=3199
headers_file="$(mktemp)"
server_log="$(mktemp)"
server_pid=""

cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -f "$headers_file" "$server_log"
}
trap cleanup EXIT

(
  cd .next/standalone
  PORT="$test_port" HOSTNAME=127.0.0.1 ./entrypoint.sh node apps/login/server.js
) >"$server_log" 2>&1 &
server_pid=$!

for _ in {1..50}; do
  if curl --silent --show-error --dump-header "$headers_file" --output /dev/null \
    "http://127.0.0.1:${test_port}/" 2>/dev/null; then
    break
  fi
  sleep 0.2
done

tr -d '\r' <"$headers_file" | grep -Fx "HTTP/1.1 307 Temporary Redirect" >/dev/null
tr -d '\r' <"$headers_file" | grep -Fxi "location: /ui/v2/login" >/dev/null
