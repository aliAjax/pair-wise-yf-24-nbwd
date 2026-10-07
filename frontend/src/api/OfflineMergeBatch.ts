import type { OfflineMergeBatch } from "../types/OfflineMergeBatch";
import { readStore, writeStore } from "../utils/localStorage";

const STORE_KEY = "merge-batches";

export async function listMergeBatches(): Promise<OfflineMergeBatch[]> {
  return readStore<OfflineMergeBatch[]>(STORE_KEY, () => []);
}

export async function getMergeBatch(id: number): Promise<OfflineMergeBatch | undefined> {
  const rows = await listMergeBatches();
  return rows.find((row) => row.id === id);
}

export async function getMergeBatchByBatchNo(batchNo: string): Promise<OfflineMergeBatch | undefined> {
  const rows = await listMergeBatches();
  return rows.find((row) => row.batch_no === batchNo);
}

export async function getMergeBatchByChecksum(checksum: string): Promise<OfflineMergeBatch | undefined> {
  const rows = await listMergeBatches();
  return rows.find((row) => row.checksum === checksum);
}

export async function saveMergeBatch(payload: OfflineMergeBatch): Promise<OfflineMergeBatch> {
  const rows = await listMergeBatches();
  const index = rows.findIndex((row) => row.id === payload.id);
  if (index >= 0) rows[index] = payload;
  else rows.push(payload);
  writeStore(STORE_KEY, rows);
  console.info("save OfflineMergeBatch", payload.batch_no);
  return payload;
}

export async function deleteMergeBatch(id: number): Promise<void> {
  const rows = await listMergeBatches();
  writeStore(STORE_KEY, rows.filter((row) => row.id !== id));
}
