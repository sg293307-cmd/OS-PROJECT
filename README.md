# CPU Scheduling Simulator

## Project identification

An interactive B.Tech Operating Systems project that demonstrates
non-preemptive Shortest Job First (SJF) and preemptive Shortest Remaining Time
First (SRTF). Scheduling decisions, Gantt segments, and metrics are implemented
in C and compiled to WebAssembly. React and TypeScript provide the interface.

## Prerequisites

The commands below assume macOS or Linux, a shell, and a fresh clone. No
environment variables are required.

- Node.js 20 or newer and npm 10 or newer. Verify with `node --version` and
  `npm --version`.
- Emscripten SDK (`emcc`) is required to run the simulator in a browser.
- Clang is required for the native C tests.
- CMake is optional; it is only required for the CMake/CTest workflow.

On macOS, install the native tools with:

```bash
xcode-select --install
brew install cmake
```

## Run locally

Clone the repository and enter its root before running any project command:

```bash
git clone https://github.com/sg293307-cmd/OS-PROJECT.git
cd OS-PROJECT
```

Install and activate Emscripten from the official SDK. Run these commands from
the repository root so the final `cd` returns to this project:

```bash
git clone https://github.com/emscripten-core/emsdk.git ../emsdk
cd ../emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
emcc --version
cd ../OS-PROJECT
```

Keep the terminal where `emsdk_env.sh` was sourced open, or source it again
before running the WASM build.

Install JavaScript dependencies:

```bash
npm install
```

Generate the browser engine before starting the simulator:

```bash
./src-c/build-wasm.sh
test -f public/wasm/scheduler.js
test -f public/wasm/scheduler.wasm
```

Start the development server:

```bash
npm run dev -- --host 127.0.0.1
```

Open the URL printed by Vite, normally
[http://127.0.0.1:5173/](http://127.0.0.1:5173/). The simulator requires both
generated files in `public/wasm/`; if they are missing, the UI can load but
running a simulation reports that the WASM module is unavailable.

Create a production build with:

```bash
npm run build
```

Preview the production build with:

```bash
npm run preview -- --host 127.0.0.1
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/).

Run the frontend test suite with:

```bash
npm test
npm run test:coverage
```

Tests use Vitest, jsdom, and React Testing Library. Coverage output is
generated in `coverage/`.

## Features

- Editable process workload manager.
- SJF and SRTF simulation.
- C-generated Gantt chart and process metrics.
- Timeline playback.
- Performance analytics.
- CSV process import and process/result/Gantt export.
- Local simulation history.
- Algorithm guide and academic project context.

## Architecture

```text
React + TypeScript UI
        ↓
TypeScript WASM service
        ↓
Emscripten scheduler.js / scheduler.wasm
        ↓
C scheduling engine
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for ownership and data flow, and
[ALGORITHMS.md](./ALGORITHMS.md) for algorithms and formulas.

## Technology stack

- React 18 and TypeScript
- Vite
- C11
- Emscripten/WebAssembly
- Vitest, jsdom, and React Testing Library
- CTest-compatible CMake configuration

## Folder structure

```text
src/                  React UI, types, services
src-c/                C engine, ABI, native tests, build scripts
tests/                Frontend tests
public/wasm/          Generated Emscripten output (ignored)
```

## Native C engine

With Clang installed:

```bash
cd src-c
clang -std=c11 -Wall -Wextra -Werror -Iinclude \
  process.c gantt.c metrics.c sjf.c srtf.c scheduler.c \
  wasm_api.c tests/test_scheduler.c -lm -o /tmp/test_scheduler
/tmp/test_scheduler
```

Run the ABI test harness with:

```bash
cd src-c
clang -std=c11 -Wall -Wextra -Werror -Iinclude \
  process.c gantt.c metrics.c sjf.c srtf.c scheduler.c \
  wasm_api.c tests/test_wasm_api.c -lm -o /tmp/test_wasm_api
/tmp/test_wasm_api
cd ..
```

If CMake is installed:

```bash
cmake -S src-c -B src-c/build
cmake --build src-c/build
ctest --test-dir src-c/build --output-on-failure
```

## Emscripten build

From the repository root:

```bash
./src-c/build-wasm.sh
```

This writes `scheduler.js` and `scheduler.wasm` to `public/wasm/`. Start the
frontend only after those files exist:

```bash
npm run dev
```

The generated files are intentionally ignored by Git, so every new clone must
run the Emscripten build locally. The build script exits with
`emcc: command not found` if the SDK has not been activated in the current
terminal.

## Formulas

```text
TAT = CT - AT
WT  = TAT - BT
RT  = first CPU start - AT
CPU utilization = busy time / elapsed time × 100
Throughput = completed processes / elapsed time
```

Initial idle time is included because elapsed time starts at zero.

## Documentation and demonstration

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [ALGORITHMS.md](./ALGORITHMS.md)
- [DEMO_CHECKLIST.md](./DEMO_CHECKLIST.md)
- [QA_REPORT.md](./QA_REPORT.md)
- [FRONTEND_TEST_REPORT.md](./FRONTEND_TEST_REPORT.md)
- [src-c/TEST_REPORT.md](./src-c/TEST_REPORT.md)
- [src-c/WASM_ABI.md](./src-c/WASM_ABI.md)

Screenshots are intentionally not committed as build artifacts. Capture the
Overview, Simulator, Analytics, and History screens during the live demo after
generating the local WASM files.

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
- Emscripten WASM loader and flat-array ABI integration
- CSV process/result/Gantt import and export
- Local simulation history with reopen and delete controls

The frontend service now loads the generated Emscripten module from
`public/wasm/scheduler.js` and calls the C `run_scheduler` flat-array ABI.
Generate the module with `./src-c/build-wasm.sh` after installing Emscripten.
The generated WASM files are intentionally ignored by Git.

CSV process imports require the header `pid,arrival_time,burst_time`. Completed
results and Gantt segments can be exported from the Process Manager. Simulation
history is stored locally in the browser under the `schedulr.simulation-history`
key and contains only process inputs and engine results.
