import { beforeEach, describe, expect, it } from "vitest";
import { ganttCsv, parseProcessCsv, processCsv, resultCsv } from "../src/services/csvService";
import { clearHistory, readHistory, saveHistory } from "../src/services/historyService";

const result = {
  algorithm: "sjf" as const,
  processes: [{ pid: "P1", arrivalTime: 0, burstTime: 2, completionTime: 2, turnaroundTime: 2, waitingTime: 0, responseTime: 0 }],
  segments: [{ pid: "P1", startTime: 0, endTime: 2 }],
  averageWaitingTime: 0, averageTurnaroundTime: 2, cpuUtilization: 100, throughput: 0.5, elapsedTime: 2,
};

describe("CSV operations", () => {
  it("parses valid CSV and exports process/result/Gantt data", () => {
    const processes = parseProcessCsv("pid,arrival_time,burst_time\nP1,0,2\nP2,3,1");
    expect(processes).toEqual([{ pid: "P1", arrivalTime: 0, burstTime: 2 }, { pid: "P2", arrivalTime: 3, burstTime: 1 }]);
    expect(processCsv(processes)).toContain("P1,0,2");
    expect(resultCsv(result)).toContain("PID,AT,BT,CT,TAT,WT,RT");
    expect(ganttCsv(result)).toContain("P1,0,2");
  });

  it("rejects malformed headers, numeric values, duplicate IDs, and missing rows", () => {
    expect(() => parseProcessCsv("id,arrival_time,burst_time\nP1,0,1")).toThrow("headers");
    expect(() => parseProcessCsv("pid,arrival_time,burst_time\nP1,-1,1")).toThrow("arrival");
    expect(() => parseProcessCsv("pid,arrival_time,burst_time\nP1,0,0")).toThrow("burst");
    expect(() => parseProcessCsv("pid,arrival_time,burst_time\nP1,0,1\nP1,2,1")).toThrow("Duplicate");
    expect(() => parseProcessCsv("pid,arrival_time,burst_time")).toThrow("at least one");
  });
});

describe("simulation history", () => {
  beforeEach(() => localStorage.clear());
  it("persists and reads complete records", () => {
    const saved = saveHistory({ algorithm: "sjf", input: result.processes.map(({ pid, arrivalTime, burstTime }) => ({ pid, arrivalTime, burstTime })), result });
    expect(saved.id).toBeTruthy();
    expect(readHistory()[0].result.processes[0].completionTime).toBe(2);
    clearHistory();
    expect(readHistory()).toEqual([]);
  });
});
