export const ConflictResolution = ["PENDING", "LOCAL", "REMOTE"] as const;
export type ConflictResolution = (typeof ConflictResolution)[number];
export const ConflictResolutionText: Record<ConflictResolution, string> = {
  PENDING: "待裁决",
  LOCAL: "保留本地",
  REMOTE: "保留离线"
};
