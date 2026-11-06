import { useMemo, useRef, useState } from "react";
import { downloadCsv, ganttCsv, parseProcessCsv, processCsv, resultCsv } from "./services/csvService";
import { clearHistory, deleteHistory, readHistory, saveHistory, type SimulationHistoryRecord } from "./services/historyService";
import { runScheduler, validateProcessInput } from "./services/wasmService";
import type { Algorithm, ProcessInput, SimulationResult } from "./types";

type View = "overview" | "processes" | "simulator" | "analytics" | "history" | "guide" | "about";

const sampleProcesses: ProcessInput[] = [
  { pid: "P1", arrivalTime: 0, burstTime: 7 },
  { pid: "P2", arrivalTime: 2, burstTime: 4 },
  { pid: "P3", arrivalTime: 4, burstTime: 1 },
  { pid: "P4", arrivalTime: 5, burstTime: 4 },
];

const navItems: { id: View; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "processes", label: "Process manager", icon: "▦" },
  { id: "simulator", label: "Simulator", icon: "▷" },
  { id: "analytics", label: "Analytics", icon: "◒" },
  { id: "history", label: "History", icon: "↺" },
  { id: "guide", label: "Algorithm guide", icon: "?" },
  { id: "about", label: "About project", icon: "i" },
];

function App() {
  const [view, setView] = useState<View>("overview");
  const [algorithm, setAlgorithm] = useState<Algorithm>("sjf");
  const [processes, setProcesses] = useState<ProcessInput[]>(sampleProcesses);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<SimulationHistoryRecord[]>(() => readHistory());

  const execute = async () => {
    setError("");
    try {
      validateProcessInput(processes);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fix the process input before running a simulation.");
      return;
    }
    setBusy(true);
    try {
      const next = await runScheduler(algorithm, processes);
      setResult(next);
      setHistory((current) => [saveHistory({ algorithm, input: processes, result: next }), ...current]);
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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">S</span><span>Schedulr</span></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {navItems.map((item) => (
            <button className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)} key={item.id}>
              <span className="nav-icon">{item.icon}</span>{item.label}
              {item.id === "simulator" && result && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="wasm-status"><span className="status-dot" /><div><strong>Engine ready</strong><small>C / WebAssembly</small></div></div>
          <div className="version">v0.1.0 · Frontend phase</div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div><span className="breadcrumb">Workspace / </span><strong>{navItems.find((item) => item.id === view)?.label}</strong></div>
          <div className="top-actions"><span className="kbd">⌘ K</span><button className="icon-button" aria-label="Notifications">♢</button><div className="avatar">OS</div></div>
        </header>
        <div className="page">
          {view === "overview" && <Overview result={result} onNavigate={setView} onRun={execute} />}
          {view === "processes" && <ProcessManager processes={processes} updateProcess={updateProcess} setProcesses={setProcesses} onRun={execute} error={error} setError={setError} result={result} />}
          {view === "simulator" && <Simulator algorithm={algorithm} setAlgorithm={setAlgorithm} result={result} busy={busy} onRun={execute} error={error} />}
          {view === "analytics" && <Analytics result={result} />}
          {view === "history" && <History records={history} onOpen={(record) => { setAlgorithm(record.algorithm); setProcesses(record.input); setResult(record.result); setView("simulator"); }} onDelete={(id) => { deleteHistory(id); setHistory(readHistory()); }} onClear={() => { if (window.confirm("Clear all simulation history?")) { clearHistory(); setHistory([]); } }} />}
          {view === "guide" && <Guide />}
          {view === "about" && <About />}
        </div>
      </main>
    </div>
  );
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-intro"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Overview({ result, onNavigate, onRun }: { result: SimulationResult | null; onNavigate: (view: View) => void; onRun: () => void }) {
  return <><PageIntro eyebrow="CPU SCHEDULING LAB" title="Simulation overview" description="Explore how scheduling decisions shape system performance." action={<button className="primary-button" onClick={onRun}>▷ Run simulation</button>} />
    <div className="hero-card"><div><span className="pill blue">INTERACTIVE SIMULATOR</span><h2>Make scheduling visible.</h2><p>Build a workload, choose an algorithm, and watch the CPU move through every execution segment.</p><div className="hero-actions"><button className="primary-button" onClick={() => onNavigate("processes")}>Manage processes <span>→</span></button><button className="text-button" onClick={() => onNavigate("guide")}>Read the guide</button></div></div><div className="hero-orbit"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="cpu-chip">CPU<br /><b>01</b></div><div className="process-chip chip-a">P1 <span>7ms</span></div><div className="process-chip chip-b">P3 <span>1ms</span></div></div></div>
    <div className="section-heading"><h3>Workspace at a glance</h3><span>Live from your latest run</span></div>
    <div className="metric-grid"><Metric label="Processes" value={result?.processes.length ?? "—"} detail={result ? "in latest run" : "No run yet"} icon="▦" /><Metric label="Avg. waiting time" value={result ? `${result.averageWaitingTime.toFixed(1)} ms` : "—"} detail="Lower is better" icon="◷" /><Metric label="CPU utilization" value={result ? `${result.cpuUtilization.toFixed(1)}%` : "—"} detail="Busy / elapsed time" icon="◒" /><Metric label="Throughput" value={result ? result.throughput.toFixed(3) : "—"} detail="Processes / ms" icon="↗" /></div>
    <div className="overview-lower"><div className="panel recent-panel"><div className="panel-header"><div><h3>Latest simulation</h3><span className="muted">Most recent engine output</span></div><button className="text-button" onClick={() => onNavigate("simulator")}>Open results →</button></div>{result ? <div className="latest-run"><div className="run-algorithm"><span className="algorithm-icon">{result.algorithm === "sjf" ? "S" : "T"}</span><div><strong>{result.algorithm === "sjf" ? "Non-preemptive SJF" : "Preemptive SJF / SRTF"}</strong><small>Completed just now · {result.elapsedTime}ms elapsed</small></div></div><div className="mini-bars">{result.processes.map((p) => <div key={p.pid} className="mini-bar-row"><span>{p.pid}</span><div><i style={{ width: `${Math.max(8, (p.waitingTime / Math.max(...result.processes.map((x) => x.waitingTime), 1)) * 100)}%` }} /></div><em>{p.waitingTime}ms WT</em></div>)}</div></div> : <EmptyState text="Run a simulation to see your latest metrics here." />}</div><div className="panel"><div className="panel-header"><div><h3>Quick start</h3><span className="muted">Recommended workflow</span></div></div><ol className="steps"><li className="done"><span>✓</span><div><strong>Review the sample workload</strong><small>Four processes are ready to run.</small></div></li><li><span>2</span><div><strong>Choose an algorithm</strong><small>Compare SJF and SRTF behavior.</small></div></li><li><span>3</span><div><strong>Inspect the timeline</strong><small>Follow execution and metrics.</small></div></li></ol></div></div>
  </>;
}

function ProcessManager({ processes, updateProcess, setProcesses, onRun, error, setError, result }: { processes: ProcessInput[]; updateProcess: (index: number, patch: Partial<ProcessInput>) => void; setProcesses: (processes: ProcessInput[]) => void; onRun: () => void; error: string; setError: (message: string) => void; result: SimulationResult | null }) {
  const add = () => setProcesses([...processes, { pid: `P${processes.length + 1}`, arrivalTime: 0, burstTime: 1 }]);
  const remove = (index: number) => setProcesses(processes.filter((_, i) => i !== index));
  const loadSample = () => setProcesses(sampleProcesses);
  const fileInput = useRef<HTMLInputElement>(null);
  const importCsv = async (file: File) => { try { setProcesses(parseProcessCsv(await file.text())); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not import CSV."); } };
  return <><PageIntro eyebrow="INPUT CONFIGURATION" title="Process manager" description="Define the workload that the C scheduling engine will evaluate." action={<div className="button-row"><button className="secondary-button" onClick={loadSample}>↻ Load sample</button><button className="primary-button" onClick={onRun}>▷ Run simulation</button></div>} />
    {error && <div className="error-banner">! {error}</div>}
    <div className="panel table-panel"><div className="panel-header"><div><h3>Process queue <span className="count-badge">{processes.length}</span></h3><span className="muted">All times are measured in milliseconds.</span></div><div className="table-actions"><button className="secondary-button small" onClick={add}>＋ Add process</button><input ref={fileInput} hidden aria-label="CSV file" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); event.target.value = ""; }} /><button className="icon-button small" title="Import CSV" aria-label="Import CSV" onClick={() => fileInput.current?.click()}>⇧</button><button className="icon-button small" title="Export CSV" aria-label="Export CSV" onClick={() => downloadCsv("processes.csv", processCsv(processes))}>⇩</button>{result && <button className="icon-button small" title="Export results CSV" aria-label="Export results CSV" onClick={() => downloadCsv("results.csv", resultCsv(result))}>R</button>}{result && <button className="icon-button small" title="Export Gantt CSV" aria-label="Export Gantt CSV" onClick={() => downloadCsv("gantt.csv", ganttCsv(result))}>G</button>}</div></div><div className="process-table"><div className="table-row table-head"><span>PROCESS ID</span><span>ARRIVAL TIME</span><span>BURST TIME</span><span>STATUS</span><span /></div>{processes.map((process, index) => <div className="table-row" key={`${process.pid}-${index}`}>    <div className="pid-cell"><span className="pid-dot" /> <input aria-label={`Process ID ${index + 1}`} value={process.pid} onChange={(e) => updateProcess(index, { pid: e.target.value })} /></div><NumberInput label={`Arrival time ${index + 1}`} value={process.arrivalTime} onChange={(value) => updateProcess(index, { arrivalTime: value })} /><NumberInput label={`Burst time ${index + 1}`} value={process.burstTime} min={1} onChange={(value) => updateProcess(index, { burstTime: value })} /><span><span className="status-tag ready">Ready</span></span><button className="delete-button" onClick={() => remove(index)} aria-label={`Delete ${process.pid}`}>×</button></div>)}</div><div className="table-footer"><span><span className="success-dot" /> Input validated locally</span><span>Tip: use unique IDs and positive burst times</span></div></div>
  </>;
}

function NumberInput({ label, value, min = 0, onChange }: { label: string; value: number; min?: number; onChange: (value: number) => void }) {
  return <input aria-label={label} className="number-input" type="number" min={min} value={Number.isNaN(value) ? "" : value} onChange={(e) => onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))} />;
}

function History({ records, onOpen, onDelete, onClear }: { records: SimulationHistoryRecord[]; onOpen: (record: SimulationHistoryRecord) => void; onDelete: (id: string) => void; onClear: () => void }) {
  return <><PageIntro eyebrow="LOCAL RUN ARCHIVE" title="Simulation history" description="Open previous engine results without rerunning the scheduler." action={records.length ? <button className="secondary-button" onClick={onClear}>Clear history</button> : undefined} />
    <div className="panel history-panel">{records.length ? records.map((record) => <div className="history-row" key={record.id}><div className="history-icon">{record.algorithm === "sjf" ? "S" : "T"}</div><div className="history-details"><strong>{record.algorithm === "sjf" ? "Non-preemptive SJF" : "Preemptive SJF / SRTF"}</strong><small>{new Date(record.timestamp).toLocaleString()} · {record.input.length} processes · {record.result.averageWaitingTime.toFixed(2)}ms avg WT</small></div><button className="text-button" onClick={() => onOpen(record)}>Open result →</button><button className="delete-button" aria-label={`Delete history ${record.id}`} onClick={() => onDelete(record.id)}>×</button></div>) : <EmptyState text="Completed simulations will appear here." />}</div>
  </>;
}

function Simulator({ algorithm, setAlgorithm, result, busy, onRun, error }: { algorithm: Algorithm; setAlgorithm: (algorithm: Algorithm) => void; result: SimulationResult | null; busy: boolean; onRun: () => void; error: string }) {
  const [playhead, setPlayhead] = useState(0);
  return <><PageIntro eyebrow="EXECUTION LAB" title="Simulator" description="Select an algorithm and inspect the execution timeline returned by the engine." action={<button className="primary-button" onClick={onRun} disabled={busy}>{busy ? "Running…" : "▷ Run engine"}</button>} />
    {error && <div className="error-banner">! {error}</div>}
    <div className="algorithm-selector"><button className={algorithm === "sjf" ? "selected" : ""} onClick={() => setAlgorithm("sjf")}><span className="algo-symbol">S</span><div><strong>Non-preemptive SJF</strong><small>Shortest Job First · runs to completion</small></div><span className="radio" /></button><button className={algorithm === "srtf" ? "selected" : ""} onClick={() => setAlgorithm("srtf")}><span className="algo-symbol cyan">T</span><div><strong>Preemptive SJF / SRTF</strong><small>Shortest Remaining Time First · can preempt</small></div><span className="radio" /></button></div>
    {result ? <><div className="panel gantt-panel"><div className="panel-header"><div><h3>Execution timeline</h3><span className="muted">{result.algorithm === "sjf" ? "Non-preemptive SJF" : "Preemptive SJF / SRTF"} · {result.elapsedTime}ms total elapsed</span></div><span className="live-tag"><span className="success-dot" /> Engine output</span></div><Gantt result={result} playhead={playhead} /><div className="playback"><button onClick={() => setPlayhead(0)}>↺</button><button className="play-button" onClick={() => setPlayhead((current) => current >= result.elapsedTime ? 0 : result.elapsedTime)}>▶</button><input type="range" min="0" max={result.elapsedTime} value={playhead} onChange={(e) => setPlayhead(Number(e.target.value))} /><span className="timecode">{playhead}ms <em>/ {result.elapsedTime}ms</em></span></div></div><ResultsTable result={result} /></> : <div className="panel empty-large"><div className="empty-graphic">▷</div><h3>No simulation output yet</h3><p>Run the engine to generate a Gantt timeline and process metrics.</p></div>}
  </>;
}

function Gantt({ result, playhead }: { result: SimulationResult; playhead: number }) {
  const colors = ["pink", "blue", "purple", "orange", "green", "teal"];
  return <div className="gantt-wrap"><div className="gantt"><div className="gantt-track">{result.segments.map((segment, index) => <div key={`${segment.pid}-${segment.startTime}`} className={`gantt-segment ${segment.pid === null ? "idle" : colors[index % colors.length]}`} style={{ width: `${((segment.endTime - segment.startTime) / result.elapsedTime) * 100}%` }}><strong>{segment.pid ?? "IDLE"}</strong><small>{segment.endTime - segment.startTime}ms</small></div>)}<div className="playhead" style={{ left: `${(playhead / result.elapsedTime) * 100}%` }} /></div><div className="gantt-axis"><span>0ms</span>{result.segments.map((segment) => <span key={segment.endTime}>{segment.endTime}ms</span>)}</div></div><div className="gantt-legend">{[...new Set(result.segments.filter((segment) => segment.pid).map((segment) => segment.pid))].map((pid, index) => <span key={pid}><i className={`legend-dot ${colors[index % colors.length]}`} />{pid}</span>)}{result.segments.some((segment) => !segment.pid) && <span><i className="legend-dot idle" />Idle</span>}</div></div>;
}

function ResultsTable({ result }: { result: SimulationResult }) {
  return <div className="panel table-panel results-panel"><div className="panel-header"><div><h3>Process metrics</h3><span className="muted">Calculated by the scheduling engine</span></div><span className="success-label">✓ Complete</span></div><div className="process-table"><div className="table-row table-head"><span>PROCESS</span><span>CT</span><span>TAT</span><span>WT</span><span>RT</span></div>{result.processes.map((process) => <div className="table-row" key={process.pid}><div className="pid-cell"><span className="pid-dot" /> {process.pid}</div><span>{process.completionTime}ms</span><span>{process.turnaroundTime}ms</span><span className="accent-value">{process.waitingTime}ms</span><span>{process.responseTime}ms</span></div>)}</div></div>;
}

function Analytics({ result }: { result: SimulationResult | null }) {
  const maxWait = result ? Math.max(...result.processes.map((process) => process.waitingTime), 1) : 1;
  return <><PageIntro eyebrow="PERFORMANCE INSIGHTS" title="Analytics" description="Understand the trade-offs behind each scheduling decision." />{result ? <><div className="metric-grid"><Metric label="Avg. waiting time" value={`${result.averageWaitingTime.toFixed(2)} ms`} detail="Across all processes" icon="◷" /><Metric label="Avg. turnaround" value={`${result.averageTurnaroundTime.toFixed(2)} ms`} detail="Arrival to completion" icon="↗" /><Metric label="CPU utilization" value={`${result.cpuUtilization.toFixed(1)}%`} detail={`${result.elapsedTime}ms elapsed`} icon="◒" /><Metric label="Throughput" value={result.throughput.toFixed(3)} detail="Processes per ms" icon="⌁" /></div><div className="analytics-grid"><div className="panel chart-panel"><div className="panel-header"><div><h3>Waiting time by process</h3><span className="muted">Lower bars indicate less queue time</span></div></div><div className="bar-chart">{result.processes.map((process) => <div className="chart-column" key={process.pid}><div className="chart-value">{process.waitingTime}ms</div><div className="chart-bar" style={{ height: `${Math.max(8, (process.waitingTime / maxWait) * 150)}px` }} /><span>{process.pid}</span></div>)}</div></div><div className="panel insight-panel"><div className="panel-header"><div><h3>Run summary</h3><span className="muted">What the data tells us</span></div></div><div className="insight"><span className="insight-icon">◒</span><div><strong>{result.cpuUtilization.toFixed(0)}% CPU utilization</strong><p>The CPU spent {result.elapsedTime}ms completing {result.processes.length} processes.</p></div></div><div className="insight"><span className="insight-icon purple">◷</span><div><strong>{result.processes.reduce((sum, process) => sum + process.waitingTime, 0)}ms total waiting</strong><p>Waiting time is the turnaround time minus each burst time.</p></div></div></div></div></> : <div className="panel empty-large"><div className="empty-graphic">◒</div><h3>Analytics appear after a run</h3><p>Complete a simulation to compare performance metrics.</p></div>}</>;
}

function Guide() {
  return <><PageIntro eyebrow="LEARN THE CONCEPTS" title="Algorithm guide" description="The ideas behind the scheduling strategies in this simulator." /><div className="guide-grid"><GuideCard accent="blue" symbol="S" title="Non-preemptive SJF" subtitle="Shortest Job First" text="At every decision point, select the available process with the smallest burst time. Once selected, it runs until completion." bullets={["Simple and deterministic", "Good average waiting time", "Long jobs can experience starvation"]} /><GuideCard accent="cyan" symbol="T" title="Preemptive SJF" subtitle="Shortest Remaining Time First" text="The running process may be interrupted when a newly arrived process has a strictly shorter remaining time." bullets={["Responds quickly to short jobs", "More context switches", "Tie-breaking preserves fairness"]} /><div className="panel formulas"><h3>Metrics glossary</h3><div className="formula-row"><span>Completion time</span><code>CT</code><strong>Time when a process finishes</strong></div><div className="formula-row"><span>Turnaround time</span><code>TAT</code><strong>CT − arrival time</strong></div><div className="formula-row"><span>Waiting time</span><code>WT</code><strong>TAT − burst time</strong></div><div className="formula-row"><span>Response time</span><code>RT</code><strong>First start − arrival time</strong></div></div></div></>;
}

function GuideCard({ accent, symbol, title, subtitle, text, bullets }: { accent: string; symbol: string; title: string; subtitle: string; text: string; bullets: string[] }) {
  return <div className="panel guide-card"><div className={`guide-symbol ${accent}`}>{symbol}</div><div className="eyebrow">{subtitle}</div><h3>{title}</h3><p>{text}</p><ul>{bullets.map((bullet) => <li key={bullet}><span>✓</span>{bullet}</li>)}</ul></div>;
}

function About() {
  return <><PageIntro eyebrow="PROJECT CONTEXT" title="About this project" description="A visual companion for understanding CPU scheduling in Operating Systems." /><div className="about-grid"><div className="panel about-card"><span className="pill blue">B.TECH OPERATING SYSTEMS</span><h2>Correctness first.<br /><span>Clarity always.</span></h2><p>Schedulr is an educational CPU scheduling simulator. Its architecture keeps scheduling decisions in a C engine compiled to WebAssembly, while React owns the interface and visualization.</p><div className="stack-row"><span>C engine</span><span>WebAssembly</span><span>React + TypeScript</span></div></div><div className="panel principles"><h3>Architecture principles</h3>{["The C engine is authoritative for metrics.", "The frontend never recomputes engine output.", "Every timeline segment is directly visualized.", "Tie-breaking is deterministic and testable."].map((item, index) => <div className="principle" key={item}><span>0{index + 1}</span><strong>{item}</strong></div>)}</div></div><div className="disclaimer"><span>ⓘ</span><p><strong>WASM phase</strong> — The interface calls the C scheduler through the flat WebAssembly ABI. Generate the local Emscripten assets before running the browser demo.</p></div></>;
}

function Metric({ label, value, detail, icon }: { label: string; value: string | number; detail: string; icon: string }) {
  return <div className="metric-card"><span className="metric-icon">{icon}</span><div><span className="metric-label">{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

function EmptyState({ text }: { text: string }) { return <div className="empty-state"><span>⌁</span><p>{text}</p></div>; }

export default App;
