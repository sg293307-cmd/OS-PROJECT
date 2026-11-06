# Frontend Automated Test Report

## Command

```bash
npm test
```

Result: **16 tests passed across 3 test files**.

Coverage:

```bash
npm run test:coverage
```

Latest summary:

| Scope | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| All frontend files | 71.17% | 80.34% | 73.80% | 71.17% |
| `App.tsx` | 92.96% | 83.33% | 72.72% | 92.96% |
| `wasmService.ts` | 90.39% | 78.37% | 100% | 90.39% |

## Covered behavior

- Process creation, deletion, PID editing, arrival-time editing, and burst-time
  editing.
- Sample dataset loading.
- Invalid numeric input validation.
- Duplicate process error presentation.
- SJF and SRTF selection.
- Simulator loading state and error path.
- C-result process metrics and aggregate analytics display.
- Gantt process and idle segments.
- Playback slider updates.
- WASM input marshaling and output conversion.
- SJF/SRTF ABI identifiers.
- WASM allocation cleanup.
- Empty input, duplicate IDs, module-load failures, and C status errors.

The generated HTML coverage report is written to `coverage/`, which is ignored
as a local build artifact.
