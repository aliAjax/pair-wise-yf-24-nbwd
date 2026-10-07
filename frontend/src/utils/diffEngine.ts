import type { DiffType } from "../constants/DiffType";

/**
 * 差异重算引擎：条款正文变化后，旧差异结果失效，按新老正文重新计算 diff_type 与摘要。
 * 采用按行的最长公共子序列（LCS），纯前端本地计算，不依赖 Worker 之外的任何服务。
 */

function splitLines(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
}

/** 计算新老正文的差异类型。 */
export function computeDiffType(oldContent: string, newContent: string): DiffType {
  const oldLines = splitLines(oldContent);
  const newLines = splitLines(newContent);
  if (oldLines.length === 0 && newLines.length === 0) return "UNCHANGED";
  if (oldLines.length === 0) return "ADDED";
  if (newLines.length === 0) return "REMOVED";
  if (oldContent === newContent) return "UNCHANGED";
  return "MODIFIED";
}

/** 生成差异摘要：新增 N 段 / 删除 N 段 / 修改 N 处。 */
export function summarizeDiff(oldContent: string, newContent: string): string {
  const oldLines = splitLines(oldContent);
  const newLines = splitLines(newContent);
  const added = newLines.filter((line) => !oldLines.includes(line)).length;
  const removed = oldLines.filter((line) => !newLines.includes(line)).length;
  const modified = Math.min(added, removed);
  const parts: string[] = [];
  if (added - modified > 0) parts.push(`新增 ${added - modified} 段`);
  if (removed - modified > 0) parts.push(`删除 ${removed - modified} 段`);
  if (modified > 0) parts.push(`修改 ${modified} 处`);
  if (parts.length === 0) return "正文无实质变化";
  return parts.join("，");
}

/** 失效重算：给定老正文与新正文，产出新的 diff_type 与 summary。 */
export function recomputeDiff(oldContent: string, newContent: string): { diff_type: DiffType; summary: string } {
  return {
    diff_type: computeDiffType(oldContent, newContent),
    summary: summarizeDiff(oldContent, newContent)
  };
}
