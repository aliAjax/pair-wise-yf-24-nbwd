export const formatDate = (value: string) => new Date(value).toLocaleString("zh-CN");
export const formatStatus = (value: string) => value.replace(/_/g, " ");
export const formatNumber = (value: number) => new Intl.NumberFormat("zh-CN").format(value);
export const formatRisk = (value: string) => ({ LOW: "低", MEDIUM: "中", HIGH: "高", CRITICAL: "严重", EXTREME: "极高" }[value] ?? value);
export const formatFieldSource = (value: string) => ({ LOCAL: "本地", OFFLINE: "离线" }[value] ?? value);
export const formatMergeStatus = (value: string) => ({ PENDING: "待合并", MERGING: "合并中", INTERRUPTED: "已中断", COMPLETED: "已完成" }[value] ?? value);
