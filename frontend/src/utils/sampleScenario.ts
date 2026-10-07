import type { PolicySection } from "../types/PolicySection";
import type { DiffResult } from "../types/DiffResult";
import type { ReviewNote } from "../types/ReviewNote";
import type { OfflinePayload } from "../types/OfflineMergeBatch";

/**
 * 生成演示用的离线合并场景：
 *  - 条款 1：本地改了 heading，离线改了 content → 字段级合并，双方都保留
 *  - 条款 2：本地与离线都改了 content 且值不同 → 字段级冲突
 *  - 条款 3：离线更新正文 → 差异失效重算，备注转「待复核」
 *  - 条款 4：离线新增条款（含差异与备注）→ 分配新 id
 *
 * 同时返回 localOverrides，用于在合并前制造「本地已分歧」的既成事实。
 */

export interface SampleScenario {
  payload: OfflinePayload;
  localOverrides: {
    PolicySection: PolicySection[];
  };
  sourceDevice: string;
}

export function buildSampleScenario(
  localSections: PolicySection[],
  localDiffs: DiffResult[],
  localNotes: ReviewNote[]
): SampleScenario {
  // base = 当前本地快照
  const baseSections = localSections.map((row) => ({ ...row }));
  const baseDiffs = localDiffs.map((row) => ({ ...row }));
  const baseNotes = localNotes.map((row) => ({ ...row }));

  // 本地分歧：条款 1 改 heading，条款 2 改 content
  const localOverrides: PolicySection[] = localSections.map((row) => {
    if (row.id === 1) return { ...row, heading: "heading 1（本地修订）" };
    if (row.id === 2) return { ...row, content: "content 2（本地改）" };
    return { ...row };
  });

  // 离线分歧：条款 1 改 content，条款 2 改 content（不同值），条款 3 改正文，新增条款 4
  const remoteSections: PolicySection[] = [
    ...localSections.map((row) => {
      if (row.id === 1) return { ...row, content: "content 1（离线补充）" };
      if (row.id === 2) return { ...row, content: "content 2（离线改）" };
      if (row.id === 3) return { ...row, content: "content 3（离线更新正文）" };
      return { ...row };
    }),
    {
      id: 4,
      document_id: 4,
      section_no: "section no 4",
      heading: "heading 4（离线新增）",
      content: "content 4（离线新增条款）",
      category: "UNCHANGED",
      risk_level: "LOW"
    }
  ];

  const remoteDiffs: DiffResult[] = [
    ...localDiffs.map((row) => ({ ...row })),
    {
      id: 4,
      old_document_id: 4,
      new_document_id: 4,
      section_id: 4,
      diff_type: "ADDED",
      summary: "离线新增条款",
      created_at: "2026-10-07T08:00:00Z"
    }
  ];

  const remoteNotes: ReviewNote[] = [
    ...localNotes.map((row) => ({ ...row })),
    {
      id: 4,
      diff_result_id: 4,
      tag: "tag 4",
      comment: "comment 4（离线新增备注）",
      reviewer: "reviewer 4",
      status: "OPEN"
    }
  ];

  return {
    payload: {
      base: { PolicySection: baseSections, DiffResult: baseDiffs, ReviewNote: baseNotes },
      remote: { PolicySection: remoteSections, DiffResult: remoteDiffs, ReviewNote: remoteNotes }
    },
    localOverrides: { PolicySection: localOverrides },
    sourceDevice: "laptop-zhangwei"
  };
}
