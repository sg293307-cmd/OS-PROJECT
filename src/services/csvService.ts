import type { ProcessInput, SimulationResult } from "../types";

const REQUIRED_HEADERS = ["pid", "arrival_time", "burst_time"];

export function parseProcessCsv(csv: string): ProcessInput[] {
  const rows = parseRows(csv);
  if (!rows.length) throw new Error("CSV file is empty.");
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  if (headers.length !== REQUIRED_HEADERS.length ||
      headers.some((header, index) => header !== REQUIRED_HEADERS[index])) {
    throw new Error("CSV headers must be: pid, arrival_time, burst_time.");
  }
  if (rows.length === 1) throw new Error("CSV must contain at least one process row.");
  const ids = new Set<string>();
  return rows.slice(1).map((row, index) => {
    const line = index + 2;
    if (row.length !== 3 || row.some((field) => !field.trim())) {
      throw new Error(`CSV row ${line} must contain PID, arrival time, and burst time.`);
    }
    const [pid, arrivalRaw, burstRaw] = row.map((field) => field.trim());
    if (ids.has(pid)) throw new Error(`Duplicate process ID "${pid}" on CSV row ${line}.`);
    const arrivalTime = Number(arrivalRaw);
    const burstTime = Number(burstRaw);
    if (!Number.isInteger(arrivalTime) || arrivalTime < 0) {
      throw new Error(`CSV row ${line} has an invalid arrival time.`);
    }
    if (!Number.isInteger(burstTime) || burstTime <= 0) {
      throw new Error(`CSV row ${line} has an invalid burst time.`);
    }
    ids.add(pid);
    return { pid, arrivalTime, burstTime };
  });
}

function parseRows(csv: string): string[][] {
  return csv.trim().split(/\r?\n/).filter(Boolean).map((line) => {
    const fields: string[] = [];
    let field = "";
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) {
        fields.push(field);
        field = "";
      } else field += char;
    }
    if (quoted) throw new Error("CSV contains an unterminated quoted field.");
    fields.push(field);
    return fields;
  });
}

export function processCsv(processes: ProcessInput[]): string {
  return ["pid,arrival_time,burst_time", ...processes.map((p) => `${escapeCsv(p.pid)},${p.arrivalTime},${p.burstTime}`)].join("\n");
}

export function resultCsv(result: SimulationResult): string {
  return [
    "PID,AT,BT,CT,TAT,WT,RT",
    ...result.processes.map((p) => [p.pid, p.arrivalTime, p.burstTime, p.completionTime, p.turnaroundTime, p.waitingTime, p.responseTime].map(escapeCsv).join(",")),
  ].join("\n");
}

export function ganttCsv(result: SimulationResult): string {
  return ["PID,Start Time,End Time", ...result.segments.map((s) => [s.pid ?? "IDLE", s.startTime, s.endTime].map(escapeCsv).join(","))].join("\n");
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
