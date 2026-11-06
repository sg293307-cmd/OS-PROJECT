import type { Algorithm, ProcessInput, SimulationResult } from "../types";

export type SimulationHistoryRecord = {
  id: string;
  timestamp: string;
  algorithm: Algorithm;
  input: ProcessInput[];
  result: SimulationResult;
};

const STORAGE_KEY = "schedulr.simulation-history";

export function readHistory(): SimulationHistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as SimulationHistoryRecord[] : [];
  } catch {
    return [];
  }
}

export function saveHistory(record: Omit<SimulationHistoryRecord, "id" | "timestamp">): SimulationHistoryRecord {
  const saved = { ...record, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([saved, ...readHistory()]));
  return saved;
}

export function deleteHistory(id: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readHistory().filter((record) => record.id !== id)));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
