import type { PolicySection } from "../types/PolicySection";
import type { DiffResult } from "../types/DiffResult";
import type { ReviewNote } from "../types/ReviewNote";
import type { OfflinePayload, MergeItemState } from "../types/OfflineMergeBatch";
import type { MergeConflict } from "../types/MergeConflict";
import type { EntityType } from "../constants/EntityType";
import { recomputeDiff } from "./diffEngine";

/**
 * 三路字段级合并引擎。
 *
 * 场景：法务同事离线改了条款/差异/备注，回到内网合并。同一条款的不同字段可能两边各改一次，
 * 合并时按字段来源（本地 LOCAL / 离线 REMOTE）分别取数，不能让晚到的整行覆盖。
 *
 * 规则（base 为离线快照，local 为当前本地，remote 为离线包）：
 *  - 两边都没改            → 取 base
 *  - 仅本地改              → 取本地
 *  - 仅离线改              → 取离线
 *  - 两边都改且值相同      → 取该值
 *  - 两边都改且值不同      → 字段级冲突，默认取本地并记录冲突供裁决
 *
 * 条款正文变化后，旧差异结果失效重算 diff_type/summary；关联审阅备注保留原文、状态转「待复核」。
 */

export interface MergeLocalState {
  PolicySection: PolicySection[];
  DiffResult: DiffResult[];
  ReviewNote: ReviewNote[];
}

export interface MergeCallbacks {
  shouldInterrupt?: () => boolean;
  onSectionDone?: (item: MergeItemState) => void;
}

export interface MergeOptions {
  /** 续传时跳过已合并条款（按原始 section id），避免重复处理。 */
  skipSectionIds?: Set<number>;
}

export interface MergeOutput {
  sections: PolicySection[];
  diffResults: DiffResult[];
  reviewNotes: ReviewNote[];
  conflicts: MergeConflict[];
  items: MergeItemState[];
  invalidatedDiffIds: number[];
  invalidatedNoteIds: number[];
  addedSectionIds: number[];
  interrupted: boolean;
}

const SECTION_FIELDS = ["section_no", "heading", "content", "category", "risk_level"] as const;
const DIFF_FIELDS = ["diff_type", "summary"] as const;
const NOTE_FIELDS = ["tag", "comment", "reviewer", "status"] as const;

function toMap<T extends { id: number }>(rows: T[]): Map<number, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

function unionIds(...maps: Map<number, unknown>[]): number[] {
  const set = new Set<number>();
  maps.forEach((map) => map.forEach((_, id) => set.add(id)));
  return [...set].sort((a, b) => a - b);
}

function makeConflict(
  batchId: number,
  entityType: EntityType,
  entityId: number,
  field: string,
  baseValue: string,
  localValue: string,
  remoteValue: string,
  now: string
): MergeConflict {
  return {
    id: 0 as never,
    batch_id: batchId,
    entity_type: entityType,
    entity_id: entityId,
    field,
    base_value: baseValue,
    local_value: localValue,
    remote_value: remoteValue,
    resolution: "PENDING",
    resolved_value: "",
    created_at: now
  };
}

/** 通用三路字段合并：逐字段按来源取数，冲突字段默认本地并记录。 */
function mergeFields(
  base: Record<string, unknown> | null,
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  fields: readonly string[],
  entityType: EntityType,
  entityId: number,
  batchId: number,
  now: string,
  conflicts: MergeConflict[]
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...local };
  for (const field of fields) {
    const b = base ? ((base[field] as string) ?? "") : "";
    const l = ((local[field] as string) ?? "") as string;
    const r = ((remote[field] as string) ?? "") as string;
    if (l === b && r === b) {
      merged[field] = l;
    } else if (l !== b && r === b) {
      merged[field] = l;
    } else if (l === b && r !== b) {
      merged[field] = r;
    } else if (l === r) {
      merged[field] = l;
    } else {
      merged[field] = l;
      conflicts.push(makeConflict(batchId, entityType, entityId, field, b, l, r, now));
    }
  }
  return merged;
}

export function runMerge(
  local: MergeLocalState,
  payload: OfflinePayload,
  batchId: number,
  now: string,
  callbacks: MergeCallbacks = {},
  options: MergeOptions = {}
): MergeOutput {
  const skipSectionIds = options.skipSectionIds ?? new Set<number>();
  const baseSectionMap = toMap(payload.base.PolicySection);
  const localSectionMap = toMap(local.PolicySection);
  const remoteSectionMap = toMap(payload.remote.PolicySection);

  const baseDiffMap = toMap(payload.base.DiffResult);
  const localDiffMap = toMap(local.DiffResult);
  const remoteDiffMap = toMap(payload.remote.DiffResult);

  const baseNoteMap = toMap(payload.base.ReviewNote);
  const localNoteMap = toMap(local.ReviewNote);
  const remoteNoteMap = toMap(payload.remote.ReviewNote);

  // 新行（离线新增）需要分配新本地 id，并重建外键引用。
  const sectionIdRemap = new Map<number, number>();
  const diffIdRemap = new Map<number, number>();
  let nextSectionId = Math.max(0, ...localSectionMap.keys()) + 1;
  let nextDiffId = Math.max(0, ...localDiffMap.keys()) + 1;
  let nextNoteId = Math.max(0, ...localNoteMap.keys()) + 1;

  const mergedSections: PolicySection[] = [];
  const mergedDiffs: DiffResult[] = [];
  const mergedNotes: ReviewNote[] = [];
  const conflicts: MergeConflict[] = [];
  const items: MergeItemState[] = [];
  const invalidatedDiffIds: number[] = [];
  const invalidatedNoteIds: number[] = [];
  const addedSectionIds: number[] = [];

  // 按 section 聚合其 diff 与 note，便于「条款」为粒度续传。
  const diffIdsBySection = new Map<number, number[]>();
  const noteIdsByDiff = new Map<number, number[]>();
  const collectDiffRef = (diff: DiffResult) => {
    const list = diffIdsBySection.get(diff.section_id) ?? [];
    if (!list.includes(diff.id)) list.push(diff.id);
    diffIdsBySection.set(diff.section_id, list);
  };
  const collectNoteRef = (note: ReviewNote) => {
    const list = noteIdsByDiff.get(note.diff_result_id) ?? [];
    if (!list.includes(note.id)) list.push(note.id);
    noteIdsByDiff.set(note.diff_result_id, list);
  };
  [...baseDiffMap.values(), ...localDiffMap.values(), ...remoteDiffMap.values()].forEach(collectDiffRef);
  [...baseNoteMap.values(), ...localNoteMap.values(), ...remoteNoteMap.values()].forEach(collectNoteRef);

  const sectionIds = unionIds(baseSectionMap, localSectionMap, remoteSectionMap);

  for (const sectionId of sectionIds) {
    if (skipSectionIds.has(sectionId)) continue;
    if (callbacks.shouldInterrupt?.()) {
      return {
        sections: mergedSections,
        diffResults: mergedDiffs,
        reviewNotes: mergedNotes,
        conflicts,
        items,
        invalidatedDiffIds,
        invalidatedNoteIds,
        addedSectionIds,
        interrupted: true
      };
    }

    const inLocal = localSectionMap.has(sectionId);
    const inRemote = remoteSectionMap.has(sectionId);
    const baseSection = baseSectionMap.get(sectionId) ?? null;
    const localSection = localSectionMap.get(sectionId);
    const remoteSection = remoteSectionMap.get(sectionId);

    let mergedSection: PolicySection;
    let finalSectionId: number;
    let sectionChanged = false;

    if (inRemote && !inLocal) {
      // 离线新增条款：分配新本地 id，原样采用离线内容。
      finalSectionId = nextSectionId++;
      sectionIdRemap.set(sectionId, finalSectionId);
      mergedSection = {
        ...(remoteSection as PolicySection),
        id: finalSectionId,
        document_id: (localSection?.document_id ?? remoteSection?.document_id ?? 1) as number
      };
      addedSectionIds.push(finalSectionId);
      sectionChanged = true;
    } else if (inRemote && inLocal) {
      finalSectionId = sectionId;
      const merged = mergeFields(
        baseSection as unknown as Record<string, unknown> | null,
        localSection as unknown as Record<string, unknown>,
        remoteSection as unknown as Record<string, unknown>,
        SECTION_FIELDS,
        "PolicySection",
        finalSectionId,
        batchId,
        now,
        conflicts
      );
      mergedSection = { ...(localSection as PolicySection), ...(merged as object), id: finalSectionId };
      sectionChanged = (baseSection?.content ?? "") !== (mergedSection.content ?? "");
    } else {
      // 仅本地存在：离线未触碰，保留本地。
      finalSectionId = sectionId;
      mergedSection = { ...(localSection as PolicySection) };
    }

    mergedSections.push(mergedSection);

    // 处理该条款下的差异结果。
    const diffIds = diffIdsBySection.get(sectionId) ?? [];
    for (const diffId of diffIds) {
      const baseDiff = baseDiffMap.get(diffId) ?? null;
      const localDiff = localDiffMap.get(diffId);
      const remoteDiff = remoteDiffMap.get(diffId);
      const inLocalDiff = localDiffMap.has(diffId);
      const inRemoteDiff = remoteDiffMap.has(diffId);

      let mergedDiff: DiffResult;
      let finalDiffId: number;
      let diffInvalidated = false;

      // 差异归属条款可能因离线新增条款而重映射。
      const remappedSectionId = sectionIdRemap.get(sectionId) ?? sectionId;

      if (inRemoteDiff && !inLocalDiff) {
        finalDiffId = nextDiffId++;
        diffIdRemap.set(diffId, finalDiffId);
        mergedDiff = {
          ...(remoteDiff as DiffResult),
          id: finalDiffId,
          section_id: remappedSectionId,
          old_document_id: (localDiff?.old_document_id ?? remoteDiff?.old_document_id ?? 1) as number,
          new_document_id: (localDiff?.new_document_id ?? remoteDiff?.new_document_id ?? 1) as number
        };
        diffInvalidated = sectionChanged;
      } else if (inRemoteDiff && inLocalDiff) {
        finalDiffId = diffId;
        const merged = mergeFields(
          baseDiff as unknown as Record<string, unknown> | null,
          localDiff as unknown as Record<string, unknown>,
          remoteDiff as unknown as Record<string, unknown>,
          DIFF_FIELDS,
          "DiffResult",
          finalDiffId,
          batchId,
          now,
          conflicts
        );
        mergedDiff = { ...(localDiff as DiffResult), ...(merged as object), id: finalDiffId, section_id: remappedSectionId };
        diffInvalidated = sectionChanged;
      } else {
        finalDiffId = diffId;
        mergedDiff = { ...(localDiff as DiffResult), section_id: remappedSectionId };
        diffInvalidated = sectionChanged;
      }

      if (diffInvalidated) {
        // 条款正文变化 → 旧差异结果失效，按新老正文重算。
        const recomputed = recomputeDiff(baseSection?.content ?? "", mergedSection.content ?? "");
        mergedDiff.diff_type = recomputed.diff_type;
        mergedDiff.summary = recomputed.summary;
        invalidatedDiffIds.push(finalDiffId);
      }

      mergedDiffs.push(mergedDiff);

      // 处理该差异下的审阅备注。
      const noteIds = noteIdsByDiff.get(diffId) ?? [];
      for (const noteId of noteIds) {
        const baseNote = baseNoteMap.get(noteId) ?? null;
        const localNote = localNoteMap.get(noteId);
        const remoteNote = remoteNoteMap.get(noteId);
        const inLocalNote = localNoteMap.has(noteId);
        const inRemoteNote = remoteNoteMap.has(noteId);

        let mergedNote: ReviewNote;
        let finalNoteId: number;

        // 备注归属差异可能因离线新增差异而重映射。
        const remappedDiffId = diffIdRemap.get(diffId) ?? diffId;

        if (inRemoteNote && !inLocalNote) {
          finalNoteId = nextNoteId++;
          mergedNote = { ...(remoteNote as ReviewNote), id: finalNoteId, diff_result_id: remappedDiffId };
        } else if (inRemoteNote && inLocalNote) {
          finalNoteId = noteId;
          const merged = mergeFields(
            baseNote as unknown as Record<string, unknown> | null,
            localNote as unknown as Record<string, unknown>,
            remoteNote as unknown as Record<string, unknown>,
            NOTE_FIELDS,
            "ReviewNote",
            finalNoteId,
            batchId,
            now,
            conflicts
          );
          mergedNote = { ...(localNote as ReviewNote), ...(merged as object), id: finalNoteId, diff_result_id: remappedDiffId };
        } else {
          finalNoteId = noteId;
          mergedNote = { ...(localNote as ReviewNote), diff_result_id: remappedDiffId };
        }

        if (diffInvalidated) {
          // 差异失效 → 审阅备注保留原文，状态转「待复核」。
          mergedNote.status = "PENDING_REVIEW";
          if (!invalidatedNoteIds.includes(finalNoteId)) invalidatedNoteIds.push(finalNoteId);
        }

        mergedNotes.push(mergedNote);
      }
    }

    items.push({
      entity_type: "PolicySection",
      entity_id: sectionId,
      final_id: finalSectionId,
      status: "MERGED",
      merged_at: now
    });
    callbacks.onSectionDone?.(items[items.length - 1]);
  }

  return {
    sections: mergedSections,
    diffResults: mergedDiffs,
    reviewNotes: mergedNotes,
    conflicts,
    items,
    invalidatedDiffIds,
    invalidatedNoteIds,
    addedSectionIds,
    interrupted: false
  };
}

/**
 * 将合并结果应用回本地：输出行（本次合并）优先，本地行中未被输出覆盖的部分（已合并/未触达）保留。
 * 这样续传时已合并条款的既成事实不会被重算覆盖。
 */
export function applyMerge(local: MergeLocalState, output: MergeOutput): MergeLocalState {
  const sectionIds = new Set(output.sections.map((row) => row.id));
  const diffIds = new Set(output.diffResults.map((row) => row.id));
  const noteIds = new Set(output.reviewNotes.map((row) => row.id));
  return {
    PolicySection: [...output.sections, ...local.PolicySection.filter((row) => !sectionIds.has(row.id))],
    DiffResult: [...output.diffResults, ...local.DiffResult.filter((row) => !diffIds.has(row.id))],
    ReviewNote: [...output.reviewNotes, ...local.ReviewNote.filter((row) => !noteIds.has(row.id))]
  };
}
