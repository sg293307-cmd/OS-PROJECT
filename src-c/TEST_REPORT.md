# C Scheduling Engine Test Report

## Command executed

From `src-c/`:

```bash
clang -std=c11 -Wall -Wextra -Werror -Iinclude \
  process.c gantt.c metrics.c sjf.c srtf.c scheduler.c \
  tests/test_scheduler.c -lm -o /tmp/test_scheduler
/tmp/test_scheduler
```

Result:

```text
All comprehensive scheduler tests passed.
```

## Coverage

The test harness covers:

- Single-process SJF and SRTF runs.
- Multiple processes arriving at time zero.
- Different arrival times and burst lengths.
- SJF shortest-burst selection.
- SJF burst, arrival-time, and PID tie-breaking.
- Initial, intermediate, and multiple CPU idle intervals.
- SRTF preemption by a shorter remaining process.
- No unnecessary preemption for equal remaining times.
- Consecutive SRTF preemptions.
- Completion exactly at an arrival event.
- Simultaneous arrivals and equal remaining times.
- Negative arrival times.
- Zero and negative burst times.
- Duplicate PIDs.
- Empty input.
- Invalid algorithm identifiers.
- Null input and output arguments.
- Gantt segment merging.
- Input-array immutability.

## Invariants checked

For every successful run, the suite verifies:

- Each process executes exactly its burst time.
- No process executes before arrival.
- Timeline segments are contiguous, positive-duration, and non-overlapping.
- Adjacent identical PIDs are merged.
- Every process completes once.
- `TAT = CT - AT`.
- `WT = TAT - BT`.
- `RT = first_start_time - AT`.
- Busy time equals the sum of burst times.
- Busy time plus idle time equals elapsed time.
- CPU utilization remains between 0% and 100%.

The reference dataset is checked independently for all CT, TAT, WT, RT,
segment order, averages, utilization, and throughput values for both SJF and
SRTF.

## Result

Phase 2 passes. No Emscripten integration is started by this test phase.
