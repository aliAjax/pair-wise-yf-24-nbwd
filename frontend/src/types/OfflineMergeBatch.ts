import type { MergeBatchStatus } from "../constants/MergeBatchStatus";
import type { EntityType } from "../constants/EntityType";
import type { PolicySection } from "./PolicySection";
import type { DiffResult } from "./DiffResult";
import type { ReviewNote } from "./ReviewNote";

export type MergeableRow = PolicySection | DiffResult | ReviewNote;

export type MergeItemStatus = "PENDING" | "MERGED" | "CONFLICT" | "SKIPPED";

export interface MergeItemState {
  entity_type: EntityType;
  /** 合并前的原始 id（条款在离线包/本地中的 id），续传时据此跳过已合并条款。 */
  entity_id: number;
  /** 合并后的本地 id（离线新增条款会分配新 id）。 */
  final_id: number;
  status: MergeItemStatus;
  merged_at?: string;
}

export interface OfflinePayload {
  base: {
    PolicySection: PolicySection[];
    DiffResult: DiffResult[];
    ReviewNote: ReviewNote[];
  };
  remote: {
    PolicySection: PolicySection[];
    DiffResult: DiffResult[];
    ReviewNote: ReviewNote[];
  };
}

export interface OfflineMergeBatch {
  id: number;
  batch_no: string;
  source_device: string;
  exported_at: string;
  imported_at: string;
  status: MergeBatchStatus;
  total_items: number;
  processed_items: number;
  checksum: string;
  payload: OfflinePayload;
  items: MergeItemState[];
}
