# CPU Scheduling Simulator

Frontend phase for the CPU Scheduling Simulator architecture.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

## Frontend scope

- Responsive dark developer-tool interface
- Dashboard with latest-run summary and quick-start flow
- Process manager with editable process rows, sample data, validation, and run action
- SJF and SRTF algorithm selection
- SVG/CSS Gantt timeline with idle segments and playback playhead
- Per-process CT, TAT, WT, and RT results
- Analytics cards and waiting-time chart
- Algorithm guide, formulas, and project architecture notes
- Isolated `runScheduler` service boundary ready for the generated C/WASM module

The current service uses a deterministic development adapter so the frontend can be demonstrated before the C engine and WebAssembly integration are complete. Replace the implementation in `src/services/wasmService.ts` with the final Emscripten ABI adapter; the React UI already consumes the intended typed result shape.
