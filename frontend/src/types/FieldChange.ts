export interface FieldChange {
  field: string;
  value: unknown;
  updated_at: string;
}

export interface OfflineRecord<T> {
  record: T;
  field_changes: FieldChange[];
}

export type FieldTimestamps = Record<string, string>;

export interface StampedRow<T> {
  data: T;
  field_timestamps: FieldTimestamps;
}
