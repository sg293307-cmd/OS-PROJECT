# WebAssembly ABI

`run_scheduler` is the single flat-array entry point exposed to JavaScript.
It accepts integer process arrays and caller-owned output buffers. It returns a
`SchedulerError` integer and never returns C structs to JavaScript.

## Algorithm identifiers

| Value | Algorithm |
|---:|---|
| `0` | Non-preemptive SJF |
| `1` | Preemptive SJF / SRTF |

## Segment capacity

The caller supplies `max_segments`. SJF uses at most `process_count` segments,
but SRTF can produce more segments because arrivals can cause preemption. The
recommended first capacity is `process_count * 2 + 1`; callers must retry with
a larger buffer when `SCHEDULER_ERROR_BUFFER_TOO_SMALL` is returned. On that
error, `*segment_count` contains the required segment count and no result
outputs are considered valid.

## Memory ownership

All arrays passed to `run_scheduler` remain owned by the caller. The function
allocates temporary native memory only, frees it before returning, and writes
only into buffers supplied by the caller. Emscripten builds export `_malloc` and
`_free` for the TypeScript service to allocate those buffers in WASM memory.

## Error codes

The values are declared in `include/scheduler.h`:

- `0`: success
- `1`: null pointer
- `2`: invalid process count or segment capacity
- `3`: invalid process values
- `4`: duplicate process ID
- `5`: invalid algorithm
- `6`: allocation failure
- `7`: integer time overflow
- `8`: output segment buffer too small

## Build

Install and activate Emscripten, then run from the repository root:

```bash
./src-c/build-wasm.sh
```

The generated `scheduler.js` and `scheduler.wasm` files are written to
`public/wasm/`. They are generated build outputs and should not be
committed unless the deployment workflow explicitly requires checked-in WASM.
