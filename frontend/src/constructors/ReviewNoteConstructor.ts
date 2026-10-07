import type { ReviewNote } from "../types/ReviewNote";

export const createDefaultReviewNote = (overrides: Partial<ReviewNote> = {}): ReviewNote => ({
  id: 1 as never,
  diff_result_id: 1 as never,
  tag: "tag 1" as never,
  comment: "comment 1" as never,
  reviewer: "reviewer 1" as never,
  status: "CONFIRMED" as never,
  ...overrides
});

export const createReviewNoteForm = createDefaultReviewNote;
export const createReviewNoteResponse = createDefaultReviewNote;
