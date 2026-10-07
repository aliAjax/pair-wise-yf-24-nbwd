import { mockData } from "../mocks/seedData";
import { TABLE_NAMES } from "../constants/storageKeys";
import { ensureTableSeeded, readTable, writeTable } from "../utils/localStore";
import type { StampedRow } from "../types/FieldChange";
import type { DiffResult } from "../types/DiffResult";

const endpoint = "/api/diff-result";

export async function listDiffResult(): Promise<DiffResult[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  ensureTableSeeded(TABLE_NAMES.DiffResult, mockData.diffResult as unknown as DiffResult[]);
  return readTable<StampedRow<DiffResult>>(TABLE_NAMES.DiffResult).map((row) => ({ ...row.data }));
}

export async function saveDiffResult(payload: DiffResult) {
  console.info("save DiffResult", payload);
  ensureTableSeeded(TABLE_NAMES.DiffResult, mockData.diffResult as unknown as DiffResult[]);
  const rows = readTable<StampedRow<DiffResult>>(TABLE_NAMES.DiffResult);
  const index = rows.findIndex((row) => row.data.id === payload.id);
  const stamp = new Date().toISOString();
  const next: StampedRow<DiffResult> = {
    data: payload,
    field_timestamps: Object.fromEntries(Object.keys(payload).map((field) => [field, stamp]))
  };
  if (index >= 0) rows[index] = next;
  else rows.push(next);
  writeTable(TABLE_NAMES.DiffResult, rows);
  return payload;
}
