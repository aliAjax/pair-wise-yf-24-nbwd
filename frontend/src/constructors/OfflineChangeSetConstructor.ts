import type { FieldChange, OfflineRecord } from "../types/FieldChange";
import type { OfflineChangeSet } from "../types/OfflineChangeSet";

export const createOfflineRecord = <T>(record: T, fieldChanges: FieldChange[] = []): OfflineRecord<T> => ({
  record,
  field_changes: fieldChanges
});

export const createDefaultOfflineChangeSet = (overrides: Partial<OfflineChangeSet> = {}): OfflineChangeSet => ({
  batch_no: "" as never,
  source_device: "" as never,
  exported_at: "" as never,
  sections: [],
  diff_results: [],
  review_notes: [],
  ...overrides
});

export const createOfflineChangeSetForm = createDefaultOfflineChangeSet;
export const createOfflineChangeSetResponse = createDefaultOfflineChangeSet;
