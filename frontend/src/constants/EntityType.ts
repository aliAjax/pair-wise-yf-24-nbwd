export const EntityType = ["PolicySection", "DiffResult", "ReviewNote"] as const;
export type EntityType = (typeof EntityType)[number];
export const EntityTypeText: Record<EntityType, string> = {
  PolicySection: "条款段落",
  DiffResult: "差异结果",
  ReviewNote: "审阅备注"
};
