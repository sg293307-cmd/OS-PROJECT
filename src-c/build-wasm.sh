#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT_DIR/public/wasm"
cd "$ROOT_DIR"

emcc \
  -std=c11 -O2 \
  -Isrc-c/include \
  src-c/process.c src-c/gantt.c src-c/metrics.c \
  src-c/sjf.c src-c/srtf.c src-c/scheduler.c src-c/wasm_api.c \
  -sMODULARIZE=1 \
  -sEXPORT_ES6=1 \
  -sENVIRONMENT=web \
  -sALLOW_MEMORY_GROWTH=1 \
  -sEXPORTED_FUNCTIONS='["_run_scheduler","_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["HEAP32","HEAPF64"]' \
  -o "$ROOT_DIR/public/wasm/scheduler.js"

echo "WASM module written to public/wasm/"
