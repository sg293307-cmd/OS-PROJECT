import { useState } from "react";
import { runScheduler, validateProcessInput } from "./services/wasmService";
import type { Algorithm, ProcessInput, SimulationResult } from "./types";

const sampleProcesses: ProcessInput[] = [
  { pid: "P1", arrivalTime: 0, burstTime: 7 },
  { pid: "P2", arrivalTime: 2, burstTime: 4 },
  { pid: "P3", arrivalTime: 4, burstTime: 1 },
  { pid: "P4", arrivalTime: 5, burstTime: 4 },
];

function App() {
  const [view, setView] = useState<"processes" | "simulator">("processes");
  const [algorithm, setAlgorithm] = useState<Algorithm>("sjf");
  const [processes, setProcesses] = useState<ProcessInput[]>(sampleProcesses);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const execute = async () => {
    setError("");
    try {
      validateProcessInput(processes);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fix the process input before running.");
      return;
    }

    setBusy(true);
    try {
      const next = await runScheduler(algorithm, processes);
      setResult(next);
      setView("simulator");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The simulation could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const updateProcess = (index: number, patch: Partial<ProcessInput>) =>
    setProcesses((current) => current.map((process, i) => (i === index ? { ...process, ...patch } : process)));

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>CPU Scheduling Project</h1>
          <p>Operating Systems - SJF and SRTF</p>
        </div>
        <nav aria-label="Project sections">
          <button className={view === "processes" ? "nav active" : "nav"} onClick={() => setView("processes")}>
            Process manager
          </button>
          <button className={view === "simulator" ? "nav active" : "nav"} onClick={() => setView("simulator")}>
            Simulator
          </button>
        </nav>
      </header>

      {error && <div className="error">Error: {error}</div>}

      {view === "processes" ? (
        <ProcessManager
          processes={processes}
          updateProcess={updateProcess}
          setProcesses={setProcesses}
          onRun={execute}
          busy={busy}
        />
      ) : (
        <Simulator
          algorithm={algorithm}
          setAlgorithm={setAlgorithm}
          result={result}
          busy={busy}
          onRun={execute}
        />
      )}
    </main>
  );
}

function ProcessManager({
  processes,
  updateProcess,
  setProcesses,
  onRun,
  busy,
}: {
  processes: ProcessInput[];
  updateProcess: (index: number, patch: Partial<ProcessInput>) => void;
  setProcesses: (processes: ProcessInput[]) => void;
  onRun: () => void;
  busy: boolean;
}) {
  const add = () =>
    setProcesses([...processes, { pid: `P${processes.length + 1}`, arrivalTime: 0, burstTime: 1 }]);
  const remove = (index: number) => setProcesses(processes.filter((_, i) => i !== index));

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Process Input</h2>
          <p>Enter arrival and burst time in milliseconds.</p>
        </div>
        <button className="secondary" onClick={() => setProcesses(sampleProcesses)}>Load sample</button>
      </div>

      <div className="table">
        <div className="table-row table-head">
          <span>Process ID</span>
          <span>Arrival Time</span>
          <span>Burst Time</span>
          <span>Action</span>
        </div>
        {processes.map((process, index) => (
          <div className="table-row" key={`${process.pid}-${index}`}>
            <input
              aria-label={`Process ID ${index + 1}`}
              value={process.pid}
              onChange={(event) => updateProcess(index, { pid: event.target.value })}
            />
            <NumberInput
              label={`Arrival time ${index + 1}`}
              value={process.arrivalTime}
              onChange={(value) => updateProcess(index, { arrivalTime: value })}
            />
            <NumberInput
              label={`Burst time ${index + 1}`}
              value={process.burstTime}
              min={1}
              onChange={(value) => updateProcess(index, { burstTime: value })}
            />
            <button className="delete" aria-label={`Delete ${process.pid}`} onClick={() => remove(index)}>Delete</button>
          </div>
        ))}
      </div>

      <div className="actions">
        <button className="secondary" onClick={add}>Add process</button>
        <button className="primary" onClick={onRun} disabled={busy}>{busy ? "Running..." : "Run simulation"}</button>
      </div>
    </section>
  );
}

function NumberInput({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      aria-label={label}
      type="number"
      min={min}
      value={Number.isNaN(value) ? "" : value}
      onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
    />
  );
}

function Simulator({
  algorithm,
  setAlgorithm,
  result,
  busy,
  onRun,
}: {
  algorithm: Algorithm;
  setAlgorithm: (algorithm: Algorithm) => void;
  result: SimulationResult | null;
  busy: boolean;
  onRun: () => void;
}) {
  return (
    <section>
      <div className="panel algorithm-panel">
        <div className="panel-heading">
          <div>
            <h2>Algorithm</h2>
            <p>Choose the CPU scheduling method.</p>
          </div>
          <button className="primary" onClick={onRun} disabled={busy}>{busy ? "Running…" : "Run engine"}</button>
        </div>
        <div className="algorithm-options">
          <label>
            <input type="radio" name="algorithm" checked={algorithm === "sjf"} onChange={() => setAlgorithm("sjf")} />
            <span><strong>Non-preemptive SJF</strong><small>Shortest Job First - process runs to completion</small></span>
          </label>
          <label>
            <input type="radio" name="algorithm" checked={algorithm === "srtf"} onChange={() => setAlgorithm("srtf")} />
            <span><strong>Preemptive SJF / SRTF</strong><small>Shortest Remaining Time First - may preempt</small></span>
          </label>
        </div>
      </div>

      {result ? (
        <>
          <Gantt result={result} />
          <Metrics result={result} />
          <ResultsTable result={result} />
        </>
      ) : (
        <div className="panel empty">No simulation output yet. Run the engine to show results.</div>
      )}
    </section>
  );
}

function Gantt({ result }: { result: SimulationResult }) {
  return (
    <div className="panel gantt-panel">
      <div className="panel-heading">
        <div>
          <h2>Execution timeline</h2>
          <p>{result.algorithm === "sjf" ? "Non-preemptive SJF" : "Preemptive SJF / SRTF"} - {result.elapsedTime} ms</p>
        </div>
      </div>
      <div className="gantt">
        {result.segments.map((segment, index) => (
          <div
            className={segment.pid ? "gantt-block" : "gantt-block idle"}
            key={`${segment.pid}-${segment.startTime}-${index}`}
            style={{ width: `${((segment.endTime - segment.startTime) / result.elapsedTime) * 100}%` }}
            title={`${segment.startTime} ms to ${segment.endTime} ms`}
          >
            {segment.pid ?? "IDLE"}
          </div>
        ))}
      </div>
      <div className="gantt-axis">
        <span>0</span>
        {result.segments.map((segment) => <span key={segment.endTime}>{segment.endTime} ms</span>)}
      </div>
    </div>
  );
}

function Metrics({ result }: { result: SimulationResult }) {
  return (
    <div className="metrics">
      <div><span>Average Waiting Time</span><strong>{result.averageWaitingTime.toFixed(2)} ms</strong></div>
      <div><span>Average Turnaround Time</span><strong>{result.averageTurnaroundTime.toFixed(2)} ms</strong></div>
      <div><span>CPU Utilization</span><strong>{result.cpuUtilization.toFixed(1)}%</strong></div>
      <div><span>Throughput</span><strong>{result.throughput.toFixed(3)}</strong></div>
    </div>
  );
}

function ResultsTable({ result }: { result: SimulationResult }) {
  return (
    <div className="panel table-panel">
      <div className="panel-heading">
        <div>
          <h2>Process Metrics</h2>
          <p>Results returned by the scheduling engine.</p>
        </div>
      </div>
      <div className="table results-table">
        <div className="table-row table-head">
          <span>Process</span><span>Completion Time</span><span>Turnaround Time</span><span>Waiting Time</span><span>Response Time</span>
        </div>
        {result.processes.map((process) => (
          <div className="table-row" key={process.pid}>
            <strong>{process.pid}</strong>
            <span>{process.completionTime} ms</span>
            <span>{process.turnaroundTime} ms</span>
            <span>{process.waitingTime} ms</span>
            <span>{process.responseTime} ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
