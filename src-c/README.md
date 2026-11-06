# Standalone C Scheduling Engine

This directory contains the native C11 scheduling engine. It is independent of
the React frontend and is the implementation that will later be compiled to
WebAssembly.

## Build and run

From `src-c/`:

```bash
clang -std=c11 -Wall -Wextra -Werror -Iinclude \
  process.c gantt.c metrics.c sjf.c srtf.c scheduler.c \
  tests/test_scheduler.c -lm -o /tmp/test_scheduler
/tmp/test_scheduler
```

If CMake is installed, the equivalent build is:

```bash
cmake -S . -B build
cmake --build build
ctest --test-dir build --output-on-failure
```

The public entry point is `scheduler_run()` in `include/scheduler.h`.
It accepts an input process array, an algorithm (`SCHEDULER_ALGORITHM_SJF` or
`SCHEDULER_ALGORITHM_SRTF`), and writes a separately allocated
`SchedulerResult`. Call `scheduler_result_free()` when the result is no longer
needed.

## Design decisions

- The input array is never modified. The engine schedules a working copy.
- Integer time units are used throughout.
- SJF selects by burst time, arrival time, then PID.
- SRTF selects by remaining time, arrival time, then PID. The current process
  is retained when it ties the best alternative, preventing unnecessary
  preemption.
- A PID of `-1` denotes an idle Gantt segment.
- Adjacent segments with the same PID are merged.
- Validation returns explicit error codes for null pointers, invalid counts,
  invalid process values, duplicate PIDs, and invalid algorithms.
- Metrics are generated from the completed process state and timeline elapsed
  time; the frontend must display these values rather than recompute them.

## Known limitations

- The native API uses integer PIDs. The future WASM adapter should map frontend
  string PIDs to stable process indexes at the ABI boundary.
- The engine currently returns a dynamically allocated result object through
  an output parameter; a WASM wrapper will need explicit buffer ownership and
  capacities.
- The native test harness covers the required scheduling scenarios, input
  validation, metrics, Gantt properties, and core invariants. Large workload
  and allocator-failure tests should be added before WASM release.
