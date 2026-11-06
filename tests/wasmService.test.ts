import { beforeEach, describe, expect, it, vi } from "vitest";
import { runScheduler } from "../src/services/wasmService";
import type { SchedulerWasmModule } from "../src/services/wasmLoader";

const { loadSchedulerWasm } = vi.hoisted(() => ({
  loadSchedulerWasm: vi.fn<() => Promise<SchedulerWasmModule>>(),
}));
vi.mock("../src/services/wasmLoader", () => ({ loadSchedulerWasm }));

function createFakeModule(status = 0): SchedulerWasmModule & { freed: number[] } {
  const memory = new ArrayBuffer(1024 * 1024);
  const module = {
    HEAP32: new Int32Array(memory),
    HEAPF64: new Float64Array(memory),
    freed: [] as number[],
    nextPointer: 8,
    _malloc(size: number) {
      const pointer = this.nextPointer;
      this.nextPointer += Math.ceil(size / 8) * 8;
      return pointer;
    },
    _free(pointer: number) {
      this.freed.push(pointer);
    },
    _run_scheduler(
      _algorithm: number,
      processCount: number,
      _pids: number,
      _arrivals: number,
      _bursts: number,
      completion: number,
      turnaround: number,
      waiting: number,
      response: number,
      segmentPids: number,
      segmentStarts: number,
      segmentEnds: number,
      _maxSegments: number,
      segmentCount: number,
      averageWaiting: number,
      averageTurnaround: number,
      averageResponse: number,
      utilization: number,
      throughput: number,
      elapsed: number,
    ) {
      this.HEAP32[segmentCount >>> 2] = 2;
      if (status !== 0) return status;
      this.HEAP32.set([7, 12, 8, 16].slice(0, processCount), completion >>> 2);
      this.HEAP32.set([7, 10, 4, 11].slice(0, processCount), turnaround >>> 2);
      this.HEAP32.set([0, 6, 3, 7].slice(0, processCount), waiting >>> 2);
      this.HEAP32.set([0, 6, 3, 7].slice(0, processCount), response >>> 2);
      this.HEAP32.set([0, 2], segmentPids >>> 2);
      this.HEAP32.set([0, 7], segmentStarts >>> 2);
      this.HEAP32.set([7, 8], segmentEnds >>> 2);
      this.HEAPF64[averageWaiting >>> 3] = 4;
      this.HEAPF64[averageTurnaround >>> 3] = 8;
      this.HEAPF64[averageResponse >>> 3] = 4;
      this.HEAPF64[utilization >>> 3] = 100;
      this.HEAPF64[throughput >>> 3] = 0.25;
      this.HEAP32[elapsed >>> 2] = 16;
      return 0;
    },
  };
  return module;
}

describe("runScheduler WASM service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marshals SJF input, converts C output, and frees allocations", async () => {
    const module = createFakeModule();
    loadSchedulerWasm.mockResolvedValue(module);
    const result = await runScheduler("sjf", [
      { pid: "P1", arrivalTime: 0, burstTime: 7 },
      { pid: "P2", arrivalTime: 2, burstTime: 4 },
      { pid: "P3", arrivalTime: 4, burstTime: 1 },
      { pid: "P4", arrivalTime: 5, burstTime: 4 },
    ]);

    expect(result.algorithm).toBe("sjf");
    expect(result.processes[1]).toMatchObject({
      pid: "P2",
      completionTime: 12,
      waitingTime: 6,
    });
    expect(result.segments).toEqual([
      { pid: "P1", startTime: 0, endTime: 7 },
      { pid: "P3", startTime: 7, endTime: 8 },
    ]);
    expect(result.averageWaitingTime).toBe(4);
    expect(module.freed.length).toBeGreaterThan(10);
  });

  it("invokes the SRTF algorithm identifier", async () => {
    const module = createFakeModule();
    const run = vi.spyOn(module, "_run_scheduler");
    loadSchedulerWasm.mockResolvedValue(module);
    await runScheduler("srtf", [{ pid: "P1", arrivalTime: 0, burstTime: 1 }]);
    expect(run.mock.calls[0][0]).toBe(1);
  });

  it("reports validation, loading, and C status errors", async () => {
    await expect(runScheduler("sjf", [])).rejects.toThrow("at least one process");
    await expect(runScheduler("sjf", [
      { pid: "P1", arrivalTime: 0, burstTime: 1 },
      { pid: "P1", arrivalTime: 0, burstTime: 1 },
    ])).rejects.toThrow("Duplicate process ID");
    await expect(runScheduler("sjf", [{ pid: "P1", arrivalTime: -1, burstTime: 1 }]))
      .rejects.toThrow("non-negative integer");
    await expect(runScheduler("sjf", [{ pid: "P1", arrivalTime: 0, burstTime: 0 }]))
      .rejects.toThrow("positive integer");
    await expect(runScheduler("sjf", [{ pid: "P1", arrivalTime: Number.NaN, burstTime: 1 }]))
      .rejects.toThrow("non-negative integer");

    loadSchedulerWasm.mockRejectedValue(new Error("module unavailable"));
    await expect(runScheduler("sjf", [{ pid: "P1", arrivalTime: 0, burstTime: 1 }]))
      .rejects.toThrow("module unavailable");

    loadSchedulerWasm.mockResolvedValue(createFakeModule(5));
    await expect(runScheduler("sjf", [{ pid: "P1", arrivalTime: 0, burstTime: 1 }]))
      .rejects.toThrow("not supported");
  });
});
