export const ReviewStatus = ["OPEN", "PENDING_REVIEW", "CONFIRMED", "IGNORED", "RESOLVED"] as const;
export type ReviewStatus = (typeof ReviewStatus)[number];
export const ReviewStatusText: Record<ReviewStatus, string> = {
  OPEN: "待处理",
  PENDING_REVIEW: "待复核",
  CONFIRMED: "已确认",
  IGNORED: "已忽略",
  RESOLVED: "已解决"
};
