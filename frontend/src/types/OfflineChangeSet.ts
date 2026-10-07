import type { OfflineRecord } from "./FieldChange";
import type { PolicySection } from "./PolicySection";
import type { DiffResult } from "./DiffResult";
import type { ReviewNote } from "./ReviewNote";

export interface OfflineChangeSet {
  batch_no: string;
  source_device: string;
  exported_at: string;
  sections: OfflineRecord<PolicySection>[];
  diff_results: OfflineRecord<DiffResult>[];
  review_notes: OfflineRecord<ReviewNote>[];
}
