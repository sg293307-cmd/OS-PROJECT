export type Algorithm = "sjf" | "srtf";

export type ProcessInput = {
  pid: string;
  arrivalTime: number;
  burstTime: number;
};

export type ExecutionSegment = {
  pid: string | null;
  startTime: number;
  endTime: number;
};

export type ProcessResult = ProcessInput & {
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  responseTime: number;
};

export type SimulationResult = {
  algorithm: Algorithm;
  processes: ProcessResult[];
  segments: ExecutionSegment[];
  averageWaitingTime: number;
  averageTurnaroundTime: number;
  cpuUtilization: number;
  throughput: number;
  elapsedTime: number;
};
