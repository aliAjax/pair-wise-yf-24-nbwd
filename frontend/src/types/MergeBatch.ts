import type { MergeReport } from "./MergeReport";

export interface MergeBatch {
  id: number;
  batch_no: string;
  source_device: string;
  status: string;
  total_count: number;
  merged_count: number;
  merged_ids: number[];
  report: MergeReport;
  created_at: string;
  updated_at: string;
}
