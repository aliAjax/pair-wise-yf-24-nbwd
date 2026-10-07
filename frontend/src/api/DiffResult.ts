import { mockData } from "../mocks/seedData";
import type { DiffResult } from "../types/DiffResult";
import { readStore, writeStore } from "../utils/localStorage";

const endpoint = "/api/diff-result";
const STORE_KEY = "diff-result";

export async function listDiffResult(): Promise<DiffResult[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  return readStore<DiffResult[]>(STORE_KEY, () => [...(mockData.diffResult as unknown as DiffResult[])]);
}

export async function saveDiffResult(payload: DiffResult): Promise<DiffResult> {
  const rows = await listDiffResult();
  const index = rows.findIndex((row) => row.id === payload.id);
  if (index >= 0) rows[index] = payload;
  else rows.push(payload);
  writeStore(STORE_KEY, rows);
  console.info("save DiffResult", payload);
  return payload;
}
