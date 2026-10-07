import type { MergeBatch } from "../types/MergeBatch";
import type { MergeReport } from "../types/MergeReport";

export const createDefaultMergeReport = (overrides: Partial<MergeReport> = {}): MergeReport => ({
  batch_no: "" as never,
  status: "PENDING",
  started_at: "" as never,
  finished_at: "" as never,
  sections: { inserted: [], updated: [] },
  diff_results: { inserted: [], updated: [], recalculated: [] },
  review_notes: { inserted: [], updated: [], pending_recheck: [] },
  item_outcomes: [],
  field_sources: {},
  logs: [],
  ...overrides
});

export const createDefaultMergeBatch = (overrides: Partial<MergeBatch> = {}): MergeBatch => ({
  id: 1 as never,
  batch_no: "" as never,
  source_device: "" as never,
  status: "PENDING" as never,
  total_count: 0 as never,
  merged_count: 0 as never,
  merged_ids: [],
  report: createDefaultMergeReport(),
  created_at: "" as never,
  updated_at: "" as never,
  ...overrides
});

export const createMergeBatchForm = createDefaultMergeBatch;
export const createMergeBatchResponse = createDefaultMergeBatch;
