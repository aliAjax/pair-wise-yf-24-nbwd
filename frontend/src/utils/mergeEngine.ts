import { TABLE_NAMES } from "../constants/storageKeys";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { createDefaultMergeBatch, createDefaultMergeReport } from "../constructors/MergeBatchConstructor";
import { ensureTableSeeded, readTable, writeTable } from "./localStore";
import { mergeRecordByField } from "./fieldMerge";
import { recalculateDiff } from "./diffRecalc";
import { mockData } from "../mocks/seedData";
import type { OfflineChangeSet } from "../types/OfflineChangeSet";
import type { MergeBatch } from "../types/MergeBatch";
import type { MergeReport } from "../types/MergeReport";
import type { StampedRow } from "../types/FieldChange";
import type { PolicySection } from "../types/PolicySection";
import type { DiffResult } from "../types/DiffResult";
import type { ReviewNote } from "../types/ReviewNote";

const INTERRUPT = Symbol("MERGE_INTERRUPTED");

export interface MergeOptions {
  shouldAbort?: () => boolean;
  onItemMerged?: (sectionId: number, done: number, total: number) => void;
  now?: () => string;
  /** 每条条款之间的让出间隔（毫秒），让页面有机会响应“中断”操作。 */
  itemDelayMs?: number;
}

export function ensureSeeded(): void {
  ensureTableSeeded(TABLE_NAMES.PolicySection, mockData.policySection as unknown as PolicySection[]);
  ensureTableSeeded(TABLE_NAMES.DiffResult, mockData.diffResult as unknown as DiffResult[]);
  ensureTableSeeded(TABLE_NAMES.ReviewNote, mockData.reviewNote as unknown as ReviewNote[]);
}

/** 本地编辑入口：整行保存语义，所有字段时间戳刷新为编辑时间。 */
export function applyLocalEdit<T extends { id: number }>(
  table: (typeof TABLE_NAMES)["PolicySection" | "DiffResult" | "ReviewNote"],
  id: number,
  patch: Partial<T>,
  editedAt: string
): void {
  ensureSeeded();
  const rows = readTable<StampedRow<T>>(table);
  const row = rows.find((item) => item.data.id === id);
  if (!row) return;
  Object.assign(row.data, patch);
  for (const field of Object.keys(patch)) row.field_timestamps[field] = editedAt;
  writeTable(table, rows);
}

function readRows<T extends { id: number }>(table: (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES]) {
  return readTable<StampedRow<T>>(table);
}

function upsertRow<T extends { id: number }>(
  table: (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES],
  row: StampedRow<T>
): void {
  const rows = readRows<T>(table);
  const index = rows.findIndex((item) => item.data.id === row.data.id);
  if (index >= 0) rows[index] = row;
  else rows.push(row);
  writeTable(table, rows);
}

function findBatch(batchNo: string): MergeBatch | null {
  return readTable<MergeBatch>(TABLE_NAMES.MergeBatch).find((batch) => batch.batch_no === batchNo) ?? null;
}

function persistBatch(batch: MergeBatch): void {
  const rows = readTable<MergeBatch>(TABLE_NAMES.MergeBatch);
  const index = rows.findIndex((item) => item.batch_no === batch.batch_no);
  if (index >= 0) rows[index] = batch;
  else rows.push(batch);
  writeTable(TABLE_NAMES.MergeBatch, rows);
}

function collectSectionIds(changeSet: OfflineChangeSet): number[] {
  const ids = new Set<number>();
  changeSet.sections.forEach((item) => ids.add(item.record.id));
  changeSet.diff_results.forEach((item) => ids.add(item.record.section_id));
  return [...ids].sort((a, b) => a - b);
}

function mergeOneSection(
  sectionId: number,
  changeSet: OfflineChangeSet,
  report: MergeReport,
  now: () => string
): boolean {
  let wrote = false;
  let contentChanged = false;
  let previousContent = "";

  const incomingSection = changeSet.sections.find((item) => item.record.id === sectionId);
  if (incomingSection) {
    const localRow = readRows<PolicySection>(TABLE_NAMES.PolicySection).find((row) => row.data.id === sectionId) ?? null;
    previousContent = localRow?.data.content ?? "";
    const result = mergeRecordByField(localRow, incomingSection, changeSet.exported_at);
    upsertRow(TABLE_NAMES.PolicySection, { data: result.merged, field_timestamps: result.timestamps });
    report.field_sources[`PolicySection:${sectionId}`] = result.sources;
    if (localRow === null) report.sections.inserted.push(sectionId);
    else report.sections.updated.push(sectionId);
    contentChanged = localRow !== null && result.merged.content !== previousContent;
    wrote = wrote || localRow === null || result.changedFields.length > 0;
    report.logs.push(`${LOG_TEMPLATES.PolicySection[4]} #${sectionId} [${result.changedFields.join(",") || "无字段变化"}]`);
  }

  const incomingDiffs = changeSet.diff_results.filter((item) => item.record.section_id === sectionId);
  for (const incomingDiff of incomingDiffs) {
    const localRow = readRows<DiffResult>(TABLE_NAMES.DiffResult).find((row) => row.data.id === incomingDiff.record.id) ?? null;
    const result = mergeRecordByField(localRow, incomingDiff, changeSet.exported_at);
    upsertRow(TABLE_NAMES.DiffResult, { data: result.merged, field_timestamps: result.timestamps });
    report.field_sources[`DiffResult:${incomingDiff.record.id}`] = result.sources;
    if (localRow === null) report.diff_results.inserted.push(incomingDiff.record.id);
    else report.diff_results.updated.push(incomingDiff.record.id);
    wrote = true;
  }

  const sectionDiffIds = new Set<number>([
    ...readRows<DiffResult>(TABLE_NAMES.DiffResult).filter((row) => row.data.section_id === sectionId).map((row) => row.data.id),
    ...incomingDiffs.map((item) => item.record.id)
  ]);
  for (const incomingNote of changeSet.review_notes.filter((item) => sectionDiffIds.has(item.record.diff_result_id))) {
    const localRow = readRows<ReviewNote>(TABLE_NAMES.ReviewNote).find((row) => row.data.id === incomingNote.record.id) ?? null;
    const result = mergeRecordByField(localRow, incomingNote, changeSet.exported_at);
    upsertRow(TABLE_NAMES.ReviewNote, { data: result.merged, field_timestamps: result.timestamps });
    report.field_sources[`ReviewNote:${incomingNote.record.id}`] = result.sources;
    if (localRow === null) report.review_notes.inserted.push(incomingNote.record.id);
    else report.review_notes.updated.push(incomingNote.record.id);
    wrote = true;
  }

  if (contentChanged) {
    const section = readRows<PolicySection>(TABLE_NAMES.PolicySection).find((row) => row.data.id === sectionId);
    const newContent = section?.data.content ?? "";
    for (const diffRow of readRows<DiffResult>(TABLE_NAMES.DiffResult).filter((row) => row.data.section_id === sectionId)) {
      const recalculated = recalculateDiff(diffRow.data, previousContent, newContent, now());
      upsertRow(TABLE_NAMES.DiffResult, {
        data: recalculated,
        field_timestamps: { ...diffRow.field_timestamps, diff_type: now(), summary: now(), created_at: now() }
      });
      report.diff_results.recalculated.push(diffRow.data.id);
      report.logs.push(`${LOG_TEMPLATES.DiffResult[4]} #${diffRow.data.id} -> ${recalculated.diff_type}`);
      for (const noteRow of readRows<ReviewNote>(TABLE_NAMES.ReviewNote).filter((row) => row.data.diff_result_id === diffRow.data.id)) {
        // 备注保留合并后的 comment 原文，仅状态强制转为待复核。
        upsertRow(TABLE_NAMES.ReviewNote, {
          data: { ...noteRow.data, status: "PENDING_RECHECK" },
          field_timestamps: { ...noteRow.field_timestamps, status: now() }
        });
        report.review_notes.pending_recheck.push(noteRow.data.id);
        report.logs.push(`${LOG_TEMPLATES.ReviewNote[4]} #${noteRow.data.id}`);
      }
    }
  }

  return wrote;
}

/**
 * 合并离线变更集：
 * - 批次号幂等：同 batch_no 已完成的批次直接返回原报告，不产生新记录；
 * - 断点续跑：中断批次保留 merged_ids 检查点，重试只处理未合并条款；
 * - 字段级合并：每条记录按字段来源保留双方修改，整行不互相覆盖。
 */
export async function mergeOfflineChangeSet(
  changeSet: OfflineChangeSet,
  options: MergeOptions = {}
): Promise<MergeReport> {
  ensureSeeded();
  if (!changeSet.batch_no || !Array.isArray(changeSet.sections)) {
    throw new Error(ERROR_MESSAGES.MERGE_INVALID_PAYLOAD);
  }
  const now = options.now ?? (() => new Date().toISOString());

  const existing = findBatch(changeSet.batch_no);
  if (existing?.status === "COMPLETED") {
    existing.report.logs.push(LOG_TEMPLATES.MergeBatch[3]);
    persistBatch(existing);
    return existing.report;
  }

  const batch = existing ?? createDefaultMergeBatch({
    id: readTable<MergeBatch>(TABLE_NAMES.MergeBatch).length + 1,
    batch_no: changeSet.batch_no,
    source_device: changeSet.source_device,
    report: createDefaultMergeReport({ batch_no: changeSet.batch_no, started_at: now() }),
    created_at: now()
  });
  batch.status = "MERGING";
  batch.updated_at = now();
  if (!existing) batch.report.logs.push(LOG_TEMPLATES.MergeBatch[0]);
  persistBatch(batch);

  const report = batch.report;
  const sectionIds = collectSectionIds(changeSet);
  batch.total_count = sectionIds.length;
  persistBatch(batch);

  try {
    for (const sectionId of sectionIds) {
      if (batch.merged_ids.includes(sectionId)) continue;
      if (options.shouldAbort?.()) throw INTERRUPT;
      await new Promise((resolve) => setTimeout(resolve, options.itemDelayMs ?? 0));
      const wrote = mergeOneSection(sectionId, changeSet, report, now);
      report.item_outcomes.push({ section_id: sectionId, status: wrote ? "MERGED" : "SKIPPED" });
      batch.merged_ids.push(sectionId);
      batch.merged_count = batch.merged_ids.length;
      batch.updated_at = now();
      persistBatch(batch);
      options.onItemMerged?.(sectionId, batch.merged_count, batch.total_count);
    }
    batch.status = "COMPLETED";
    report.status = "COMPLETED";
    report.logs.push(LOG_TEMPLATES.MergeBatch[2]);
  } catch (error) {
    if (error !== INTERRUPT) throw error;
    batch.status = "INTERRUPTED";
    report.status = "INTERRUPTED";
    report.logs.push(LOG_TEMPLATES.MergeBatch[1]);
  }
  report.finished_at = now();
  batch.updated_at = now();
  persistBatch(batch);
  return report;
}
