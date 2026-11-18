import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import type { SimulationResult } from "../src/types";

const { runScheduler, validateProcessInput } = vi.hoisted(() => ({
  runScheduler: vi.fn(),
  validateProcessInput: vi.fn((input: { pid: string; arrivalTime: number; burstTime: number }[]) => {
    if (!input.length) throw new Error("Add at least one process before running a simulation.");
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

describe("CPU scheduling project UI", () => {
  beforeEach(() => {
    runScheduler.mockReset();
    runScheduler.mockResolvedValue(result);
    validateProcessInput.mockClear();
  });

  it("adds, edits, deletes, and reloads sample processes", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Add process" }));
    expect(screen.getAllByLabelText(/Process ID/)).toHaveLength(5);

    fireEvent.change(screen.getAllByLabelText(/Process ID/)[4], { target: { value: "PX" } });
    fireEvent.change(screen.getAllByLabelText(/Arrival time/)[4], { target: { value: "8" } });
    fireEvent.change(screen.getAllByLabelText(/Burst time/)[4], { target: { value: "3" } });
    expect(screen.getAllByLabelText(/Process ID/)[4]).toHaveValue("PX");

    await user.click(screen.getByRole("button", { name: "Delete PX" }));
    expect(screen.getAllByLabelText(/Process ID/)).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: "Load sample" }));
    expect(screen.getAllByLabelText(/Process ID/)[0]).toHaveValue("P1");
  });

  it("shows input validation errors", async () => {
    const user = userEvent.setup();
    validateProcessInput.mockImplementationOnce(() => {
      throw new Error("Duplicate process ID: P1.");
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Run simulation" }));
    expect(await screen.findByText(/Duplicate process ID/)).toBeInTheDocument();
    expect(runScheduler).not.toHaveBeenCalled();
  });

  it("rejects an empty process table", async () => {
    const user = userEvent.setup();
    render(<App />);

    for (const pid of ["P1", "P2", "P3", "P4"]) {
      await user.click(screen.getByRole("button", { name: `Delete ${pid}` }));
    }
    await user.click(screen.getByRole("button", { name: "Run simulation" }));

    expect(await screen.findByText(/Add at least one process/)).toBeInTheDocument();
    expect(runScheduler).not.toHaveBeenCalled();
  });

  it("runs and exposes the running state", async () => {
    const user = userEvent.setup();
    let resolveRun!: (value: SimulationResult) => void;
    runScheduler.mockReturnValue(new Promise<SimulationResult>((resolve) => {
      resolveRun = resolve;
    }));
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Simulator" }));
    await user.click(screen.getByRole("button", { name: "Run engine" }));
    expect(screen.getByRole("button", { name: "Running…" })).toBeDisabled();

    resolveRun(result);
    expect(await screen.findByText("Execution timeline")).toBeInTheDocument();
  });

  it("shows the selected algorithm, idle segments, metrics, and process results", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Simulator" }));
    expect(screen.getByText(/No simulation output yet/)).toBeInTheDocument();
    await user.click(screen.getByText("Preemptive SJF / SRTF"));
    await user.click(screen.getByRole("button", { name: "Run engine" }));

    expect(await screen.findByText("Execution timeline")).toBeInTheDocument();
    expect(screen.getByText("IDLE")).toBeInTheDocument();
    expect(screen.getByText("84.6%")).toBeInTheDocument();
    expect(screen.getAllByText("P1").length).toBeGreaterThan(0);
  });
});
