/**
 * Reversible settings history.
 *
 * Every applied change first pushes a snapshot of the watched files onto a
 * stack persisted as JSON (`dial-history.json` next to the Ghostty config,
 * overridable via the DIAL_HISTORY env var). Undo pops the latest snapshot
 * and restores it; reset restores the session-start baseline (kept in
 * memory). A missing or corrupt history file fails safe to an empty stack.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HOME } from "./config.ts";

export const HISTORY_PATH =
  process.env.DIAL_HISTORY ?? join(HOME, ".config/ghostty/dial-history.json");

export interface HistoryEntry {
  /** ISO timestamp of the change that this snapshot precedes. */
  at: string;
  /** Human-readable description of the change. */
  label: string;
  /** File path -> full contents, captured before the change. */
  files: Record<string, string>;
}

const MAX_ENTRIES = 50;

export function loadHistory(path: string = HISTORY_PATH): HistoryEntry[] {
  try {
    if (!existsSync(path)) return [];
    const data: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(data)) return [];
    return data.filter(
      (e): e is HistoryEntry =>
        typeof e === "object" && e !== null && typeof (e as HistoryEntry).files === "object",
    );
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[], path: string = HISTORY_PATH): void {
  writeFileSync(path, JSON.stringify(entries.slice(-MAX_ENTRIES), null, 2));
}

/** Capture the current contents of the given files (unreadable ones skipped). */
export function snapshotFiles(paths: string[]): Record<string, string> {
  const files: Record<string, string> = {};
  for (const p of paths) {
    try {
      files[p] = readFileSync(p, "utf8");
    } catch {}
  }
  return files;
}

/** Write a snapshot back to disk. */
export function restoreFiles(files: Record<string, string>): void {
  for (const [p, contents] of Object.entries(files)) {
    writeFileSync(p, contents);
  }
}
