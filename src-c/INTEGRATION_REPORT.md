# Phase 4 WASM Integration Report

## Implementation

- Added a cached asynchronous loader in `src/services/wasmLoader.ts`.
- Replaced the TypeScript scheduling adapter in `src/services/wasmService.ts`.
- Inputs are converted to `Int32Array` buffers.
- String process IDs are mapped to stable numeric indexes at the ABI boundary.
- C-generated process metrics and Gantt segments are converted back to the
  existing `SimulationResult` model.
- Every WASM allocation is released in a `finally` block.
- SRTF segment capacity is retried using the required count returned by C.
- C status codes are converted to user-facing errors.
- Generated assets are expected at `public/wasm/scheduler.js` and
  `public/wasm/scheduler.wasm`.

## Validation

The following checks passed:

- Native C scheduler tests.
- Native flat-array ABI tests for SJF and SRTF.
- ABI invalid algorithm, count, input, null pointer, and buffer-capacity tests.
- Native ABI tests under AddressSanitizer and UndefinedBehaviorSanitizer.
- TypeScript/Vite production build.

The browser-level WASM comparison is pending because `emcc` is not installed in
the current environment and no generated module was present in the repository
at integration time. Once Emscripten is available, run:

```bash
./src-c/build-wasm.sh
npm run dev
```

Then run the reference dataset through the Simulator screen. The returned
values should match the native ABI tests documented in `src-c/TEST_REPORT.md`.
