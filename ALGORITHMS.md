# Scheduling Algorithms and Metrics

## Non-preemptive SJF

At each decision point, C considers arrived, incomplete processes and selects:

1. Lowest burst time.
2. Earlier arrival time.
3. Lower PID.

The selected process runs to completion. If no process has arrived, the engine
records an idle segment and advances to the next arrival.

## Preemptive SJF / SRTF

At each arrival or completion event, C selects the process with:

1. Lowest remaining time.
2. Earlier arrival time.
3. Lower PID.

The running process is retained when a candidate has equal remaining time.
Preemption occurs only when a strictly shorter remaining process is available.

## Metrics

For each process:

```text
CT  = completion time
TAT = CT - arrival time
WT  = TAT - burst time
RT  = first CPU start time - arrival time
```

Aggregate values:

```text
Average WT  = sum(WT) / process count
Average TAT = sum(TAT) / process count
Average RT  = sum(RT) / process count
CPU usage   = (busy time / elapsed time) * 100
Throughput  = completed processes / elapsed time
```

Elapsed time starts at zero, so initial idle time is included.

## Gantt chart

Each segment is a half-open interval `[start_time, end_time)`. PID `-1`
represents CPU idle time. Adjacent segments with the same PID are merged.

