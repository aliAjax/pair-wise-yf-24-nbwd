export const MergeBatchStatus = ["PENDING","MERGING","INTERRUPTED","COMPLETED"] as const;
export type MergeBatchStatus = (typeof MergeBatchStatus)[number];
export const MergeBatchStatusText: Record<MergeBatchStatus, string> = Object.fromEntries(MergeBatchStatus.map((value) => [value, value.replace(/_/g, " ")])) as Record<MergeBatchStatus, string>;
