/**
 * 离线包载荷校验和：用于幂等导入时识别同一批次。
 * 纯前端本地模拟，使用稳定的字符串哈希，不依赖第三方。
 */
export async function computeChecksum(data: unknown): Promise<string> {
  const text = stableStringify(data);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return `crc32_${hex}_${text.length}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}
