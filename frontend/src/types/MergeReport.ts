import type { FieldSource } from "./FieldSource";
import type { MergeBatchStatus } from "./MergeBatchStatus";
import type { MergeItemStatus } from "./MergeItemStatus";

export interface EntityMergeStats {
  inserted: number[];
  updated: number[];
}

export interface MergeItemOutcome {
  section_id: number;
  status: MergeItemStatus;
}

export interface MergeReport {
  batch_no: string;
  status: MergeBatchStatus;
  started_at: string;
  finished_at: string;
  sections: EntityMergeStats;
  diff_results: EntityMergeStats & { recalculated: number[] };
  review_notes: EntityMergeStats & { pending_recheck: number[] };
  item_outcomes: MergeItemOutcome[];
  field_sources: Record<string, Record<string, FieldSource>>;
  logs: string[];
}
