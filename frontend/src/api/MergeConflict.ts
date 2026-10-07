import type { MergeConflict } from "../types/MergeConflict";
import { readStore, writeStore } from "../utils/localStorage";

const STORE_KEY = "merge-conflicts";

export async function listMergeConflicts(): Promise<MergeConflict[]> {
  return readStore<MergeConflict[]>(STORE_KEY, () => []);
}

export async function saveMergeConflict(payload: MergeConflict): Promise<MergeConflict> {
  const rows = await listMergeConflicts();
  const index = rows.findIndex((row) => row.id === payload.id);
  if (index >= 0) rows[index] = payload;
  else rows.push(payload);
  writeStore(STORE_KEY, rows);
  console.info("save MergeConflict", payload.entity_type, payload.entity_id, payload.field);
  return payload;
}

export async function saveMergeConflicts(payloads: MergeConflict[]): Promise<void> {
  const rows = await listMergeConflicts();
  const map = new Map(rows.map((row) => [row.id, row]));
  payloads.forEach((payload) => map.set(payload.id, payload));
  writeStore(STORE_KEY, [...map.values()]);
}
