import type { Algorithm, ExecutionSegment, ProcessInput, SimulationResult } from "../types";

// This adapter mirrors the eventual WASM boundary. Replace its implementation
// with the generated Emscripten module without changing the React surfaces.
export async function runScheduler(
  algorithm: Algorithm,
  input: ProcessInput[],
): Promise<SimulationResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 220));
  if (!input.length) throw new Error("Add at least one process before running a simulation.");
  return simulateInDevelopmentAdapter(algorithm, input);
}

function simulateInDevelopmentAdapter(algorithm: Algorithm, input: ProcessInput[]): SimulationResult {
  const processes = input.map((process) => ({
    ...process,
    completionTime: 0,
    turnaroundTime: 0,
    waitingTime: 0,
    responseTime: -1,
  }));
  const segments: ExecutionSegment[] = [];
  const remaining = new Map(processes.map((process) => [process.pid, process.burstTime]));
  let time = 0;
  let finished = 0;
  let currentPid: string | null = null;
  const addSegment = (pid: string | null, start: number, end: number) => {
    const previous = segments[segments.length - 1];
    if (previous?.pid === pid && previous.endTime === start) previous.endTime = end;
    else segments.push({ pid, startTime: start, endTime: end });
  };
  while (finished < processes.length) {
    const ready = processes.filter(
      (process) => process.arrivalTime <= time && (remaining.get(process.pid) ?? 0) > 0,
    );
    if (!ready.length) {
      const nextArrival = Math.min(
        ...processes.filter((process) => (remaining.get(process.pid) ?? 0) > 0).map((process) => process.arrivalTime),
      );
      addSegment(null, time, nextArrival);
      time = nextArrival;
      currentPid = null;
      continue;
    }
    ready.sort((a, b) => {
      if (algorithm === "sjf") return a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid);
      return (remaining.get(a.pid) ?? 0) - (remaining.get(b.pid) ?? 0) || a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid);
    });
    const selected: (typeof processes)[number] = currentPid && algorithm === "srtf"
      ? ready.find((process) => process.pid === currentPid) ?? ready[0]
      : ready[0];
    if (selected.responseTime < 0) selected.responseTime = time - selected.arrivalTime;
    const runFor = algorithm === "srtf" ? 1 : remaining.get(selected.pid) ?? 0;
    addSegment(selected.pid, time, time + runFor);
    remaining.set(selected.pid, (remaining.get(selected.pid) ?? 0) - runFor);
    time += runFor;
    currentPid = selected.pid;
    if (remaining.get(selected.pid) === 0) {
      selected.completionTime = time;
      selected.turnaroundTime = time - selected.arrivalTime;
      selected.waitingTime = selected.turnaroundTime - selected.burstTime;
      finished += 1;
      currentPid = null;
    }
  }
  const busyTime = processes.reduce((sum, process) => sum + process.burstTime, 0);
  return {
    algorithm,
    processes,
    segments,
    averageWaitingTime: processes.reduce((sum, p) => sum + p.waitingTime, 0) / processes.length,
    averageTurnaroundTime: processes.reduce((sum, p) => sum + p.turnaroundTime, 0) / processes.length,
    cpuUtilization: (busyTime / time) * 100,
    throughput: processes.length / time,
    elapsedTime: time,
  };
}
