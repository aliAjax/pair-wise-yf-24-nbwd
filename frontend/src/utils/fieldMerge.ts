import type { FieldSource } from "../types/FieldSource";
import type { OfflineRecord, StampedRow } from "../types/FieldChange";

export interface FieldMergeResult<T> {
  merged: T;
  timestamps: Record<string, string>;
  sources: Record<string, FieldSource>;
  changedFields: string[];
}

/**
 * 字段级双向合并：离线包通过 field_changes 声明“离线期间改过哪些字段、何时改的”，
 * 逐字段与本地字段时间戳比较，晚者胜出。离线未声明修改的字段一律保留本地值，
 * 因此整行快照到达再晚也不会覆盖掉本地已改的其他字段。
 */
export function mergeRecordByField<T extends object>(
  local: StampedRow<T> | null,
  incoming: OfflineRecord<T>,
  fallbackTime: string
): FieldMergeResult<T> {
  const changeByField = new Map(incoming.field_changes.map((change) => [change.field, change]));

  if (local === null) {
    const timestamps: Record<string, string> = {};
    const sources: Record<string, FieldSource> = {};
    for (const field of Object.keys(incoming.record)) {
      timestamps[field] = changeByField.get(field)?.updated_at ?? fallbackTime;
      sources[field] = "OFFLINE";
    }
    return {
      merged: { ...incoming.record },
      timestamps,
      sources,
      changedFields: incoming.field_changes.map((change) => change.field)
    };
  }

  const merged = { ...local.data } as Record<string, unknown>;
  const timestamps: Record<string, string> = { ...local.field_timestamps };
  const sources: Record<string, FieldSource> = {};
  const changedFields: string[] = [];

  for (const field of Object.keys(local.data)) {
    const change = changeByField.get(field);
    if (change && change.updated_at > (local.field_timestamps[field] ?? "")) {
      merged[field] = change.value;
      timestamps[field] = change.updated_at;
      sources[field] = "OFFLINE";
      changedFields.push(field);
    } else {
      sources[field] = "LOCAL";
    }
  }

  return { merged: merged as T, timestamps, sources, changedFields };
}
