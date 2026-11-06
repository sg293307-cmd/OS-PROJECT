import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import type { SimulationResult } from "../src/types";

const { runScheduler, validateProcessInput } = vi.hoisted(() => ({
  runScheduler: vi.fn(),
  validateProcessInput: vi.fn((input: { pid: string; arrivalTime: number; burstTime: number }[]) => {
    if (!input.length) throw new Error("Add at least one process before running a simulation.");
    const ids = new Set<string>();
    for (const process of input) {
      if (ids.has(process.pid)) throw new Error(`Duplicate process ID: ${process.pid}.`);
      if (!Number.isInteger(process.arrivalTime) || process.arrivalTime < 0) {
        throw new Error(`Arrival time for ${process.pid} must be a non-negative integer.`);
      }
      if (!Number.isInteger(process.burstTime) || process.burstTime <= 0) {
        throw new Error(`Burst time for ${process.pid} must be a positive integer.`);
      }
      ids.add(process.pid);
    }
  }),
}));
vi.mock("../src/services/wasmService", () => ({ runScheduler, validateProcessInput }));

const result: SimulationResult = {
  algorithm: "sjf",
  processes: [
    { pid: "P1", arrivalTime: 0, burstTime: 7, completionTime: 7, turnaroundTime: 7, waitingTime: 0, responseTime: 0 },
    { pid: "P2", arrivalTime: 2, burstTime: 4, completionTime: 12, turnaroundTime: 10, waitingTime: 6, responseTime: 6 },
  ],
  segments: [
    { pid: "P1", startTime: 0, endTime: 7 },
    { pid: null, startTime: 7, endTime: 9 },
    { pid: "P2", startTime: 9, endTime: 13 },
  ],
  averageWaitingTime: 3,
  averageTurnaroundTime: 8.5,
  cpuUtilization: 84.6,
  throughput: 0.15,
  elapsedTime: 13,
};

describe("CPU scheduling simulator UI", () => {
  beforeEach(() => {
    runScheduler.mockReset();
    runScheduler.mockResolvedValue(result);
    validateProcessInput.mockClear();
  });

  it("adds, edits, deletes, and reloads sample processes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Process manager/i }));

    const initialIds = screen.getAllByLabelText(/Process ID/);
    expect(initialIds).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: /Add process/i }));
    expect(screen.getAllByLabelText(/Process ID/)).toHaveLength(5);
    fireEvent.change(screen.getAllByLabelText(/Process ID/)[4], { target: { value: "PX" } });
    fireEvent.change(screen.getAllByLabelText(/Arrival time/)[4], { target: { value: "8" } });
    fireEvent.change(screen.getAllByLabelText(/Burst time/)[4], { target: { value: "3" } });
    expect(screen.getAllByLabelText(/Process ID/)[4]).toHaveValue("PX");
    expect(screen.getAllByLabelText(/Arrival time/)[4]).toHaveValue(8);
    expect(screen.getAllByLabelText(/Burst time/)[4]).toHaveValue(3);

    await user.click(screen.getByRole("button", { name: "Delete PX" }));
    expect(screen.getAllByLabelText(/Process ID/)).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: /Load sample/i }));
    expect(screen.getAllByLabelText(/Process ID/)[0]).toHaveValue("P1");
  });

  it("passes duplicate/invalid input errors to the process manager", async () => {
    const user = userEvent.setup();
    validateProcessInput.mockImplementationOnce(() => {
      throw new Error("Duplicate process ID: P1.");
    });
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /Process manager/i })[0]);
    const ids = screen.getAllByLabelText(/Process ID/);
    await user.clear(ids[1]);
    await user.type(ids[1], "P1");
    await user.click(screen.getByRole("button", { name: /Run simulation/i }));
    expect(await screen.findByText(/Duplicate process ID/)).toBeInTheDocument();
    expect(runScheduler).not.toHaveBeenCalled();
  });

  it("rejects zero burst time without running the scheduler", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /Process manager/i })[0]);
    fireEvent.change(screen.getAllByLabelText(/Burst time/)[0], { target: { value: "0" } });
    await user.click(screen.getByRole("button", { name: /Run simulation/i }));
    expect(await screen.findByText(/Burst time for P1 must be a positive integer/)).toBeInTheDocument();
    expect(runScheduler).not.toHaveBeenCalled();
  });

  it("rejects negative arrival time without running the scheduler", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /Process manager/i })[0]);
    fireEvent.change(screen.getAllByLabelText(/Arrival time/)[0], { target: { value: "-1" } });
    await user.click(screen.getByRole("button", { name: /Run simulation/i }));
    expect(await screen.findByText(/Arrival time for P1 must be a non-negative integer/)).toBeInTheDocument();
    expect(runScheduler).not.toHaveBeenCalled();
  });

  it("rejects non-numeric values without running the scheduler", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /Process manager/i })[0]);
    fireEvent.change(screen.getAllByLabelText(/Arrival time/)[0], { target: { value: "abc" } });
    await user.click(screen.getByRole("button", { name: /Run simulation/i }));
    expect(await screen.findByText(/Arrival time for P1 must be a non-negative integer/)).toBeInTheDocument();
    expect(runScheduler).not.toHaveBeenCalled();
  });

  it("rejects an empty process table without running the scheduler", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /Process manager/i })[0]);
    for (const pid of ["P1", "P2", "P3", "P4"]) {
      await user.click(screen.getByRole("button", { name: `Delete ${pid}` }));
    }
    await user.click(screen.getByRole("button", { name: /Run simulation/i }));
    expect(await screen.findByText(/Add at least one process/)).toBeInTheDocument();
    expect(runScheduler).not.toHaveBeenCalled();
  });

  it("shows a clear error for a CSV with the wrong header", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /Process manager/i })[0]);
    const file = new File(["id,arrival_time,burst_time\nP1,0,1"], "invalid.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: async () => "id,arrival_time,burst_time\nP1,0,1" });
    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });
    expect(await screen.findByText(/CSV headers must be: pid, arrival_time, burst_time/)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Process ID/)[0]).toHaveValue("P1");
    expect(runScheduler).not.toHaveBeenCalled();
  });

  it("runs valid input and exposes the running state", async () => {
    const user = userEvent.setup();
    let resolveRun!: (value: SimulationResult) => void;
    runScheduler.mockReturnValue(new Promise<SimulationResult>((resolve) => {
      resolveRun = resolve;
    }));
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /Process manager/i })[0]);
    await user.click(screen.getAllByRole("button", { name: /Simulator/i })[0]);
    await user.click(screen.getByRole("button", { name: /Run engine/i }));
    expect(screen.getByRole("button", { name: "Running…" })).toBeDisabled();
    resolveRun(result);
    expect(await screen.findByText(/Execution timeline/)).toBeInTheDocument();
  });

  it("selects algorithms, shows results, idle segments, and playback", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /Simulator/i })[0]);
    expect(screen.getByText(/No simulation output yet/)).toBeInTheDocument();
    await user.click(screen.getByText("Preemptive SJF / SRTF"));
    await user.click(screen.getByRole("button", { name: /Run engine/i }));
    expect(await screen.findByText(/Execution timeline/)).toBeInTheDocument();
    expect(screen.getByText("IDLE")).toBeInTheDocument();
    expect(screen.getAllByText("P2").length).toBeGreaterThan(0);
    expect(screen.getByRole("slider")).toHaveValue("0");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "9" } });
    expect(screen.getByRole("slider")).toHaveValue("9");
    expect(runScheduler).toHaveBeenCalledWith("srtf", expect.any(Array));
  });

  it("renders analytics from returned aggregate metrics", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Run simulation/i }));
    await user.click(screen.getByRole("button", { name: /Analytics/i }));
    expect(screen.getByText("3.00 ms")).toBeInTheDocument();
    expect(screen.getByText("8.50 ms")).toBeInTheDocument();
    expect(screen.getByText("84.6%")).toBeInTheDocument();
    expect(screen.getByText("0.150")).toBeInTheDocument();
  });
});
