export const MergeBatchStatus = ["PENDING", "IN_PROGRESS", "COMPLETED", "INTERRUPTED"] as const;
export type MergeBatchStatus = (typeof MergeBatchStatus)[number];
export const MergeBatchStatusText: Record<MergeBatchStatus, string> = {
  PENDING: "待处理",
  IN_PROGRESS: "合并中",
  COMPLETED: "已完成",
  INTERRUPTED: "已中断"
};
