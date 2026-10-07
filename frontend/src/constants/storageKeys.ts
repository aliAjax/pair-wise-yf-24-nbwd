export const STORAGE_PREFIX = "policy-diff:";

export const TABLE_NAMES = {
  PolicySection: "policySection",
  DiffResult: "diffResult",
  ReviewNote: "reviewNote",
  MergeBatch: "mergeBatch"
} as const;

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES];

export const SEED_TIMESTAMP = "2026-06-11T09:00:00Z";
