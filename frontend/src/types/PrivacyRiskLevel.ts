export const PrivacyRiskLevel = ["LOW","MEDIUM","HIGH","CRITICAL"] as const;
export type PrivacyRiskLevel = (typeof PrivacyRiskLevel)[number];
export const PrivacyRiskLevelText: Record<PrivacyRiskLevel, string> = Object.fromEntries(PrivacyRiskLevel.map((value) => [value, value.replace(/_/g, " ")])) as Record<PrivacyRiskLevel, string>;
