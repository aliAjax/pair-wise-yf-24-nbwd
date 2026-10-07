import type { OfflineMergeBatch, OfflinePayload } from "../types/OfflineMergeBatch";

export const createEmptyOfflinePayload = (): OfflinePayload => ({
  base: { PolicySection: [], DiffResult: [], ReviewNote: [] },
  remote: { PolicySection: [], DiffResult: [], ReviewNote: [] }
});

export const createDefaultOfflineMergeBatch = (overrides: Partial<OfflineMergeBatch> = {}): OfflineMergeBatch => ({
  id: 0 as never,
  batch_no: "" as never,
  source_device: "" as never,
  exported_at: "" as never,
  imported_at: "" as never,
  status: "PENDING" as never,
  total_items: 0,
  processed_items: 0,
  checksum: "" as never,
  payload: createEmptyOfflinePayload(),
  items: [],
  ...overrides
});

export const createOfflineMergeBatchForm = createDefaultOfflineMergeBatch;
export const createOfflineMergeBatchResponse = createDefaultOfflineMergeBatch;
