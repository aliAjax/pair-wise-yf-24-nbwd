export const MergeItemStatus = ["PENDING","MERGED","SKIPPED"] as const;
export type MergeItemStatus = (typeof MergeItemStatus)[number];
export const MergeItemStatusText: Record<MergeItemStatus, string> = Object.fromEntries(MergeItemStatus.map((value) => [value, value.replace(/_/g, " ")])) as Record<MergeItemStatus, string>;
