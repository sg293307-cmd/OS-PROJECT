import type { Algorithm, ExecutionSegment, ProcessInput, SimulationResult } from "../types";
import { loadSchedulerWasm, type SchedulerWasmModule } from "./wasmLoader";

const SCHEDULER_OK = 0;
const SCHEDULER_ERROR_BUFFER_TOO_SMALL = 8;
const schedulerErrorMessages: Record<number, string> = {
  1: "The scheduler received an invalid memory pointer.",
  2: "The scheduler received an invalid process count or segment capacity.",
  3: "The scheduler received invalid process data.",
  4: "Process IDs must be unique.",
  5: "The selected scheduling algorithm is not supported.",
  6: "The scheduler could not allocate WASM memory.",
  7: "The scheduler detected a time-value overflow.",
};

type Allocation = {
  pointer: number;
  bytes: number;
};

export async function runScheduler(
  algorithm: Algorithm,
  input: ProcessInput[],
): Promise<SimulationResult> {
  validateProcessInput(input);
  const module = await loadSchedulerWasm();
  return executeScheduler(module, algorithm, input);
}

export function validateProcessInput(input: ProcessInput[]): void {
  if (input.length === 0) {
    throw new Error("Add at least one process before running a simulation.");
  }
  const ids = new Set<string>();
  for (const process of input) {
    if (!process.pid.trim()) throw new Error("Every process needs a non-empty ID.");
    if (ids.has(process.pid)) throw new Error(`Duplicate process ID: ${process.pid}.`);
    if (!Number.isInteger(process.arrivalTime) || process.arrivalTime < 0) {
      throw new Error(`Arrival time for ${process.pid} must be a non-negative integer.`);
    }
    if (!Number.isInteger(process.burstTime) || process.burstTime <= 0) {
      throw new Error(`Burst time for ${process.pid} must be a positive integer.`);
    }
    ids.add(process.pid);
  }
}

function executeScheduler(
  module: SchedulerWasmModule,
  algorithm: Algorithm,
  input: ProcessInput[],
): SimulationResult {
  const processCount = input.length;
  const algorithmId = algorithm === "sjf" ? 0 : 1;
  const inputPids = new Int32Array(input.map((_, index) => index));
  const arrivals = new Int32Array(input.map((process) => process.arrivalTime));
  const bursts = new Int32Array(input.map((process) => process.burstTime));
  const allocations: Allocation[] = [];

  const allocate = (bytes: number): number => {
    const pointer = module._malloc(bytes);
    if (!pointer) throw new Error("The scheduler WASM module could not allocate memory.");
    allocations.push({ pointer, bytes });
    return pointer;
  };
  const freeAllocation = (pointer: number): void => {
    if (!pointer) return;
    module._free(pointer);
    const index = allocations.findIndex((allocation) => allocation.pointer === pointer);
    if (index >= 0) allocations.splice(index, 1);
  };

  try {
    const inputPidPointer = allocate(inputPids.byteLength);
  const arrivalPointer = allocate(arrivals.byteLength);
  const burstPointer = allocate(bursts.byteLength);
  const completionPointer = allocate(processCount * Int32Array.BYTES_PER_ELEMENT);
  const turnaroundPointer = allocate(processCount * Int32Array.BYTES_PER_ELEMENT);
  const waitingPointer = allocate(processCount * Int32Array.BYTES_PER_ELEMENT);
  const responsePointer = allocate(processCount * Int32Array.BYTES_PER_ELEMENT);
  const averageWaitingPointer = allocate(Float64Array.BYTES_PER_ELEMENT);
  const averageTurnaroundPointer = allocate(Float64Array.BYTES_PER_ELEMENT);
  const averageResponsePointer = allocate(Float64Array.BYTES_PER_ELEMENT);
  const utilizationPointer = allocate(Float64Array.BYTES_PER_ELEMENT);
  const throughputPointer = allocate(Float64Array.BYTES_PER_ELEMENT);
  const elapsedPointer = allocate(Int32Array.BYTES_PER_ELEMENT);
  const busyPointer = allocate(Int32Array.BYTES_PER_ELEMENT);
  const idlePointer = allocate(Int32Array.BYTES_PER_ELEMENT);

  module.HEAP32.set(inputPids, inputPidPointer >>> 2);
  module.HEAP32.set(arrivals, arrivalPointer >>> 2);
  module.HEAP32.set(bursts, burstPointer >>> 2);

  let segmentCapacity = Math.max(8, processCount * 2 + 1);
  let segmentPidsPointer = 0;
  let segmentStartsPointer = 0;
  let segmentEndsPointer = 0;
    while (true) {
      segmentPidsPointer = allocate(segmentCapacity * Int32Array.BYTES_PER_ELEMENT);
      segmentStartsPointer = allocate(segmentCapacity * Int32Array.BYTES_PER_ELEMENT);
      segmentEndsPointer = allocate(segmentCapacity * Int32Array.BYTES_PER_ELEMENT);
      const segmentCountPointer = allocate(Int32Array.BYTES_PER_ELEMENT);
      const status = module._run_scheduler(
        algorithmId,
        processCount,
        inputPidPointer,
        arrivalPointer,
        burstPointer,
        completionPointer,
        turnaroundPointer,
        waitingPointer,
        responsePointer,
        segmentPidsPointer,
        segmentStartsPointer,
        segmentEndsPointer,
        segmentCapacity,
        segmentCountPointer,
        averageWaitingPointer,
        averageTurnaroundPointer,
        averageResponsePointer,
        utilizationPointer,
        throughputPointer,
        elapsedPointer,
        busyPointer,
        idlePointer,
      );
      const requiredSegments = module.HEAP32[segmentCountPointer >>> 2];
      freeAllocation(segmentCountPointer);
      if (status === SCHEDULER_ERROR_BUFFER_TOO_SMALL) {
        freeAllocation(segmentPidsPointer);
        freeAllocation(segmentStartsPointer);
        freeAllocation(segmentEndsPointer);
        segmentPidsPointer = 0;
        segmentStartsPointer = 0;
        segmentEndsPointer = 0;
        if (requiredSegments <= segmentCapacity) {
          throw new Error("The scheduler returned an invalid segment-buffer size.");
        }
        segmentCapacity = requiredSegments;
        continue;
      }
      if (status !== SCHEDULER_OK) {
        throw new Error(
          schedulerErrorMessages[status] ??
            `The C scheduler failed with unknown status ${status}.`,
        );
      }

      const segmentCount = requiredSegments;
      const completion = readInt32(module, completionPointer, processCount);
      const turnaround = readInt32(module, turnaroundPointer, processCount);
      const waiting = readInt32(module, waitingPointer, processCount);
      const response = readInt32(module, responsePointer, processCount);
      const segmentPids = readInt32(module, segmentPidsPointer, segmentCount);
      const segmentStarts = readInt32(module, segmentStartsPointer, segmentCount);
      const segmentEnds = readInt32(module, segmentEndsPointer, segmentCount);
      const processes = input.map((process, index) => ({
        ...process,
        completionTime: completion[index],
        turnaroundTime: turnaround[index],
        waitingTime: waiting[index],
        responseTime: response[index],
      }));
      const segments: ExecutionSegment[] = segmentPids.map((pid, index) => ({
        pid: pid < 0 ? null : input[pid]?.pid ?? null,
        startTime: segmentStarts[index],
        endTime: segmentEnds[index],
      }));
      return {
        algorithm,
        processes,
        segments,
        averageWaitingTime: readFloat64(module, averageWaitingPointer),
        averageTurnaroundTime: readFloat64(module, averageTurnaroundPointer),
        cpuUtilization: readFloat64(module, utilizationPointer),
        throughput: readFloat64(module, throughputPointer),
        elapsedTime: readInt32(module, elapsedPointer, 1)[0],
      };
    }
  } finally {
    for (const allocation of [...allocations]) {
      module._free(allocation.pointer);
    }
    allocations.length = 0;
  }
}

function readInt32(module: SchedulerWasmModule, pointer: number, length: number): number[] {
  return Array.from(module.HEAP32.subarray(pointer >>> 2, (pointer >>> 2) + length));
}

function readFloat64(module: SchedulerWasmModule, pointer: number): number {
  return module.HEAPF64[pointer >>> 3];
}
