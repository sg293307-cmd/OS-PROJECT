# CPU Scheduling Simulator Architecture

## System boundary

```text
React UI
  ├─ process input and validation presentation
  ├─ simulator controls and playback
  ├─ Gantt, results, analytics, CSV, history
  │
  ▼
TypeScript WASM service
  ├─ validates frontend input
  ├─ maps string PIDs to numeric indexes
  ├─ allocates/copies/frees WASM memory
  └─ converts flat ABI arrays to TypeScript models
  │
  ▼
Emscripten module
  └─ generated scheduler.js + scheduler.wasm
  │
  ▼
C scheduling engine
  ├─ non-preemptive SJF
  ├─ preemptive SJF / SRTF
  ├─ Gantt segments
  └─ all process and aggregate metrics
```

## Source ownership

| Responsibility | Location |
|---|---|
| React UI and navigation | `src/App.tsx` |
| Frontend models | `src/types.ts` |
| WASM loading | `src/services/wasmLoader.ts` |
| WASM memory and ABI conversion | `src/services/wasmService.ts` |
| CSV and browser history | `src/services/` |
| Scheduling algorithms | `src-c/sjf.c`, `src-c/srtf.c` |
| Metrics | `src-c/metrics.c` |
| Public scheduler API | `src-c/scheduler.c` |
| JavaScript flat-array ABI | `src-c/wasm_api.c` |
| Native and ABI tests | `src-c/tests/` |

React does not select processes or calculate scheduling metrics. It displays
values returned by C through the WASM service.

## Data flow

1. The user edits `ProcessInput[]`.
2. The service validates IDs and integer time values.
3. String PIDs are converted to stable numeric indexes.
4. Typed arrays are allocated in WASM memory.
5. C runs SJF or SRTF and writes flat output arrays.
6. The service reads metrics and segments before freeing all pointers.
7. Numeric process indexes are mapped back to frontend PID strings.
8. React renders the returned result and playback state.

## Build outputs

Emscripten output is generated into `public/wasm/` and ignored by Git:

```text
public/wasm/scheduler.js
public/wasm/scheduler.wasm
```

