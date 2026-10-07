import type { DiffResult } from "../types/DiffResult";

export const createDefaultDiffResult = (overrides: Partial<DiffResult> = {}): DiffResult => ({
  id: 1 as never,
  old_document_id: 1 as never,
  new_document_id: 1 as never,
  section_id: 1 as never,
  diff_type: "REMOVED" as never,
  summary: "summary 1" as never,
  created_at: "2026-06-11T09:00:00Z" as never,
  ...overrides
});

export const createDiffResultForm = createDefaultDiffResult;
export const createDiffResultResponse = createDefaultDiffResult;
