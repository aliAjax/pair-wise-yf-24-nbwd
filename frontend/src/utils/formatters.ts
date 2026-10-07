import { ReviewStatusText } from "../constants/ReviewStatus";
import { MergeBatchStatusText } from "../constants/MergeBatchStatus";
import { EntityTypeText } from "../constants/EntityType";
import { ConflictResolutionText } from "../constants/ConflictResolution";

export const formatDate = (value: string) => new Date(value).toLocaleString("zh-CN");
export const formatStatus = (value: string) => value.replace(/_/g, " ");
export const formatNumber = (value: number) => new Intl.NumberFormat("zh-CN").format(value);
export const formatRisk = (value: string) => ({ LOW: "低", MEDIUM: "中", HIGH: "高", CRITICAL: "严重" }[value] ?? value);
export const formatReviewStatus = (value: string) => ReviewStatusText[value as keyof typeof ReviewStatusText] ?? value;
export const formatMergeStatus = (value: string) => MergeBatchStatusText[value as keyof typeof MergeBatchStatusText] ?? value;
export const formatEntityType = (value: string) => EntityTypeText[value as keyof typeof EntityTypeText] ?? value;
export const formatConflictResolution = (value: string) => ConflictResolutionText[value as keyof typeof ConflictResolutionText] ?? value;
