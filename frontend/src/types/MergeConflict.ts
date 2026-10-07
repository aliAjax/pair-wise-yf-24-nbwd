import type { EntityType } from "../constants/EntityType";
import type { ConflictResolution } from "../constants/ConflictResolution";

export interface MergeConflict {
  id: number;
  batch_id: number;
  entity_type: EntityType;
  entity_id: number;
  field: string;
  base_value: string;
  local_value: string;
  remote_value: string;
  resolution: ConflictResolution;
  resolved_value: string;
  created_at: string;
}
