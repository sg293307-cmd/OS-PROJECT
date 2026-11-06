# Academic Demonstration Checklist

## Live demonstration

- [ ] Start the app with `npm run dev`.
- [ ] Open the Overview screen.
- [ ] Open Process manager and show the sample workload.
- [ ] Add a process and edit PID, arrival, and burst values.
- [ ] Demonstrate invalid burst input handling.
- [ ] Import a CSV with `pid,arrival_time,burst_time`.
- [ ] Select non-preemptive SJF.
- [ ] Run the simulation.
- [ ] Explain the Gantt order and idle intervals.
- [ ] Show CT, TAT, WT, and RT.
- [ ] Open Analytics and explain aggregate metrics.
- [ ] Move the playback slider and explain that playback does not rerun C.
- [ ] Export process, results, and Gantt CSV files.
- [ ] Select SRTF and demonstrate preemption.
- [ ] Open History and reopen a stored result without rerunning it.

## Viva talking points

- C is authoritative for scheduling decisions and metrics.
- React is presentation and interaction only.
- Numeric process indexes avoid imposing numeric IDs on frontend users.
- SRTF only preempts for a strictly shorter remaining time.
- Idle time begins at zero and is included in utilization.
- Native tests run the same C engine that is compiled by Emscripten.

## Future scope

- Decision explanations and ready-queue snapshots.
- More algorithms such as FCFS and Round Robin.
- Larger workload visualization optimizations.
- Browser-level automated tests with a generated WASM artifact in CI.

