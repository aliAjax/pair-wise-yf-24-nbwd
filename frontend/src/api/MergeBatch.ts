import { TABLE_NAMES } from "../constants/storageKeys";
import { readTable, writeTable } from "../utils/localStore";
import type { MergeBatch } from "../types/MergeBatch";

const endpoint = "/api/merge-batch";

export async function listMergeBatch(): Promise<MergeBatch[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  return readTable<MergeBatch>(TABLE_NAMES.MergeBatch).map((batch) => ({ ...batch }));
}

export async function saveMergeBatch(payload: MergeBatch) {
  console.info("save MergeBatch", payload);
  const rows = readTable<MergeBatch>(TABLE_NAMES.MergeBatch);
  const index = rows.findIndex((row) => row.batch_no === payload.batch_no);
  if (index >= 0) rows[index] = payload;
  else rows.push(payload);
  writeTable(TABLE_NAMES.MergeBatch, rows);
  return payload;
}
