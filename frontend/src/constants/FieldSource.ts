export const FieldSource = ["LOCAL","OFFLINE"] as const;
export type FieldSource = (typeof FieldSource)[number];
export const FieldSourceText: Record<FieldSource, string> = { LOCAL: "本地", OFFLINE: "离线" };
