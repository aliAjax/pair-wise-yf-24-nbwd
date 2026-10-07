import type { DiffResult } from "../types/DiffResult";

/**
 * 条款正文变化后，旧差异结果失效：按新旧正文重算 diff_type 与 summary，
 * created_at 刷新为重算时间，便于审阅清单识别需要重新处理的条目。
 */
export function recalculateDiff(
  diff: DiffResult,
  oldContent: string,
  newContent: string,
  now: string
): DiffResult {
  const diff_type = !oldContent && newContent
    ? "ADDED"
    : oldContent && !newContent
      ? "REMOVED"
      : oldContent !== newContent
        ? "MODIFIED"
        : "UNCHANGED";
  const summary = `条款正文已变更，旧差异结论失效，于 ${now} 重算（原结论：${diff.summary}）`;
  return { ...diff, diff_type, summary, created_at: now };
}
