import { mockData } from "../mocks/seedData";
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
  return [...(mockData.diffResult as unknown as DiffResult[])];
}

export async function saveDiffResult(payload: DiffResult) {
  console.info("save DiffResult", payload);
  return payload;
}
