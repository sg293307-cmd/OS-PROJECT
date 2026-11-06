export type SchedulerWasmModule = {
  _malloc(size: number): number;
  _free(pointer: number): void;
  _run_scheduler(
    algorithm: number,
    processCount: number,
    pids: number,
    arrivalTimes: number,
    burstTimes: number,
    completionTimes: number,
    turnaroundTimes: number,
    waitingTimes: number,
    responseTimes: number,
    segmentPids: number,
    segmentStarts: number,
    segmentEnds: number,
    maxSegments: number,
    segmentCount: number,
    averageWaitingTime: number,
    averageTurnaroundTime: number,
    averageResponseTime: number,
    cpuUtilization: number,
    throughput: number,
    totalElapsedTime: number,
    busyTime: number,
    idleTime: number,
  ): number;
  HEAP32: Int32Array;
  HEAPF64: Float64Array;
};

type EmscriptenFactory = (options?: Record<string, unknown>) => Promise<SchedulerWasmModule>;
type RuntimeModuleImport = (modulePath: string) => Promise<Record<string, unknown>>;

let modulePromise: Promise<SchedulerWasmModule> | undefined;
const importRuntimeModule = new Function(
  "modulePath",
  "return import(/* @vite-ignore */ modulePath);",
) as RuntimeModuleImport;

export function loadSchedulerWasm(): Promise<SchedulerWasmModule> {
  if (!modulePromise) {
    const baseUrl = import.meta.env.BASE_URL.endsWith("/")
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    const modulePath = `${baseUrl}wasm/scheduler.js`;
    modulePromise = importRuntimeModule(modulePath)
      .then((module) => {
        const factory = (module.default ?? module) as EmscriptenFactory;
        if (typeof factory !== "function") {
          throw new Error("The generated scheduler WASM module has an invalid loader.");
        }
        return factory({ locateFile: (file: string) => `${baseUrl}wasm/${file}` });
      })
      .catch((error: unknown) => {
        modulePromise = undefined;
        const detail = error instanceof Error ? ` ${error.message}` : "";
        throw new Error(
          `The scheduler WASM module could not be loaded. Run ./src-c/build-wasm.sh first.${detail}`,
        );
      });
  }
  return modulePromise;
}
