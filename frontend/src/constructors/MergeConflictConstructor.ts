import type { MergeConflict } from "../types/MergeConflict";

export const createDefaultMergeConflict = (overrides: Partial<MergeConflict> = {}): MergeConflict => ({
  id: 0 as never,
  batch_id: 0 as never,
  entity_type: "PolicySection" as never,
  entity_id: 0 as never,
  field: "" as never,
  base_value: "" as never,
  local_value: "" as never,
  remote_value: "" as never,
  resolution: "PENDING" as never,
  resolved_value: "" as never,
  created_at: "" as never,
  ...overrides
});

export const createMergeConflictForm = createDefaultMergeConflict;
export const createMergeConflictResponse = createDefaultMergeConflict;
