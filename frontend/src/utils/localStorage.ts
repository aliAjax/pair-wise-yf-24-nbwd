/**
 * 本地持久化封装：纯前端 localStorage，按 key 读写 JSON。
 * 实体首次读取时以 mock 种子数据落库，之后合并/编辑都写入这里，
 * 保证离线合并后的本地状态在刷新后仍然有效。
 */
const PREFIX = "policy-diff:";

export function readStore<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch {
    // 解析失败时回退到种子数据。
  }
  const seed = fallback();
  writeStore(key, seed);
  return seed;
}

export function writeStore<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 存储失败（如隐私模式）时静默降级到内存。
  }
}

export function removeStore(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // 忽略清理失败。
  }
}

export function resetAllStores(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // 忽略重置失败。
  }
}
