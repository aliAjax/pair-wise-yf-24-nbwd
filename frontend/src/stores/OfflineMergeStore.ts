import { defineStore } from "pinia";
import { listPolicySection, savePolicySection } from "../api/PolicySection";
import { listDiffResult, saveDiffResult } from "../api/DiffResult";
import { listReviewNote, saveReviewNote } from "../api/ReviewNote";
import {
  listMergeBatches,
  saveMergeBatch,
  getMergeBatchByChecksum
} from "../api/OfflineMergeBatch";
import { listMergeConflicts, saveMergeConflict } from "../api/MergeConflict";
import { runMerge, applyMerge, type MergeLocalState, type MergeOutput } from "../utils/mergeEngine";
import { computeChecksum } from "../utils/checksum";
import { buildSampleScenario } from "../utils/sampleScenario";
import { createDefaultOfflineMergeBatch } from "../constructors/OfflineMergeBatchConstructor";
import type { OfflinePayload, OfflineMergeBatch } from "../types/OfflineMergeBatch";
import type { MergeConflict } from "../types/MergeConflict";
import { resetAllStores } from "../utils/localStorage";

interface LastSummary {
  batchNo: string;
  addedSections: number;
  invalidatedDiffs: number;
  pendingReviewNotes: number;
  conflicts: number;
  interrupted: boolean;
  duplicated: boolean;
}

export const useOfflineMergeStore = defineStore("offlineMerge", {
  state: () => ({
    batches: [] as OfflineMergeBatch[],
    conflicts: [] as MergeConflict[],
    loading: false,
    currentBatchId: null as number | null,
    interruptRequested: false,
    lastSummary: null as LastSummary | null
  }),
  getters: {
    pendingConflicts: (state) => state.conflicts.filter((c) => c.resolution === "PENDING"),
    hasPendingConflicts(): boolean {
      return this.pendingConflicts.length > 0;
    }
  },
  actions: {
    async loadBatches() {
      this.batches = await listMergeBatches();
    },
    async loadConflicts() {
      this.conflicts = await listMergeConflicts();
    },
    async loadAll() {
      this.loading = true;
      await Promise.all([this.loadBatches(), this.loadConflicts()]);
      this.loading = false;
    },

    async readLocalState(): Promise<MergeLocalState> {
      const [PolicySection, DiffResult, ReviewNote] = await Promise.all([
        listPolicySection(),
        listDiffResult(),
        listReviewNote()
      ]);
      return { PolicySection, DiffResult, ReviewNote };
    },

    async writeLocalState(state: MergeLocalState): Promise<void> {
      for (const row of state.PolicySection) await savePolicySection(row);
      for (const row of state.DiffResult) await saveDiffResult(row);
      for (const row of state.ReviewNote) await saveReviewNote(row);
    },

    /** 导入离线包：幂等校验 → 建批次 → 合并。 */
    async importBatch(payload: OfflinePayload, sourceDevice: string, exportedAt?: string) {
      this.loading = true;
      try {
        const checksum = await computeChecksum(payload);
        const existing = await getMergeBatchByChecksum(checksum);
        if (existing && existing.status === "COMPLETED") {
          this.lastSummary = {
            batchNo: existing.batch_no,
            addedSections: 0,
            invalidatedDiffs: 0,
            pendingReviewNotes: 0,
            conflicts: 0,
            interrupted: false,
            duplicated: true
          };
          return { status: "duplicated" as const, batch: existing };
        }
        if (existing && existing.status === "INTERRUPTED") {
          await this.processBatch(existing);
          return { status: "resumed" as const, batch: existing };
        }

        const now = new Date().toISOString();
        const batchNo = `batch_${checksum.slice(6, 14)}_${sourceDevice}_${now.slice(0, 10).replace(/-/g, "")}`;
        const batch = createDefaultOfflineMergeBatch({
          id: await this.nextBatchId(),
          batch_no: batchNo,
          source_device: sourceDevice,
          exported_at: exportedAt ?? now,
          imported_at: now,
          status: "PENDING",
          total_items: this.countSections(payload),
          processed_items: 0,
          checksum,
          payload,
          items: []
        });
        await saveMergeBatch(batch);
        await this.processBatch(batch);
        return { status: "imported" as const, batch };
      } finally {
        this.loading = false;
      }
    },

    /** 续传已中断批次：只处理未合完的条款。 */
    async resumeBatch(batchId: number) {
      const batch = this.batches.find((b) => b.id === batchId);
      if (!batch) return;
      batch.status = "IN_PROGRESS";
      await saveMergeBatch(batch);
      await this.processBatch(batch);
    },

    interrupt() {
      this.interruptRequested = true;
    },

    /** 合并主循环：逐条款处理，支持中断与续传。 */
    async processBatch(batch: OfflineMergeBatch) {
      this.currentBatchId = batch.id;
      this.interruptRequested = false;
      batch.status = "IN_PROGRESS";
      await saveMergeBatch(batch);

      const local = await this.readLocalState();
      const skipSectionIds = new Set(
        batch.items.filter((item) => item.status === "MERGED").map((item) => item.entity_id)
      );
      const now = new Date().toISOString();

      const output: MergeOutput = runMerge(local, batch.payload, batch.id, now, {
        shouldInterrupt: () => this.interruptRequested,
        onSectionDone: (item) => {
          if (!batch.items.find((i) => i.entity_id === item.entity_id)) {
            batch.items.push(item);
          }
          batch.processed_items = batch.items.filter((i) => i.status === "MERGED").length;
          void saveMergeBatch(batch);
        }
      }, { skipSectionIds });

      // 应用合并结果到本地（保留已合并条款的既成事实）。
      const merged = applyMerge(local, output);
      await this.writeLocalState(merged);

      // 追加新冲突（按 实体+字段 去重）。
      await this.appendConflicts(batch.id, output.conflicts);

      batch.items = this.mergeItems(batch.items, output.items);
      batch.processed_items = batch.items.filter((i) => i.status === "MERGED").length;
      batch.status = output.interrupted ? "INTERRUPTED" : "COMPLETED";
      await saveMergeBatch(batch);

      this.lastSummary = {
        batchNo: batch.batch_no,
        addedSections: output.addedSectionIds.length,
        invalidatedDiffs: output.invalidatedDiffIds.length,
        pendingReviewNotes: output.invalidatedNoteIds.length,
        conflicts: output.conflicts.length,
        interrupted: output.interrupted,
        duplicated: false
      };

      await this.loadBatches();
      await this.loadConflicts();
      this.currentBatchId = null;
    },

    /** 导出当前本地数据为离线包（base 与 remote 相同，用于离线审阅后带回）。 */
    async exportOfflinePackage(): Promise<OfflinePayload> {
      const local = await this.readLocalState();
      return {
        base: {
          PolicySection: local.PolicySection.map((row) => ({ ...row })),
          DiffResult: local.DiffResult.map((row) => ({ ...row })),
          ReviewNote: local.ReviewNote.map((row) => ({ ...row }))
        },
        remote: {
          PolicySection: local.PolicySection.map((row) => ({ ...row })),
          DiffResult: local.DiffResult.map((row) => ({ ...row })),
          ReviewNote: local.ReviewNote.map((row) => ({ ...row }))
        }
      };
    },

    /** 生成演示场景：制造本地与离线分歧后导入合并。 */
    async importSampleScenario() {
      const local = await this.readLocalState();
      const scenario = buildSampleScenario(local.PolicySection, local.DiffResult, local.ReviewNote);
      await this.writeLocalState({ ...local, PolicySection: scenario.localOverrides.PolicySection });
      return this.importBatch(scenario.payload, scenario.sourceDevice);
    },

    /** 裁决冲突：保留本地或离线，并回写到本地行。 */
    async resolveConflict(conflictId: number, resolution: "LOCAL" | "REMOTE") {
      const conflict = this.conflicts.find((c) => c.id === conflictId);
      if (!conflict) return;
      conflict.resolution = resolution;
      conflict.resolved_value = resolution === "LOCAL" ? conflict.local_value : conflict.remote_value;
      await saveMergeConflict(conflict);

      const local = await this.readLocalState();
      if (conflict.entity_type === "PolicySection") {
        const row = local.PolicySection.find((r) => r.id === conflict.entity_id);
        if (row) (row as unknown as Record<string, unknown>)[conflict.field] = conflict.resolved_value;
      } else if (conflict.entity_type === "DiffResult") {
        const row = local.DiffResult.find((r) => r.id === conflict.entity_id);
        if (row) (row as unknown as Record<string, unknown>)[conflict.field] = conflict.resolved_value;
      } else if (conflict.entity_type === "ReviewNote") {
        const row = local.ReviewNote.find((r) => r.id === conflict.entity_id);
        if (row) (row as unknown as Record<string, unknown>)[conflict.field] = conflict.resolved_value;
      }
      await this.writeLocalState(local);
      await this.loadConflicts();
    },

    async resetAll() {
      resetAllStores();
      this.batches = [];
      this.conflicts = [];
      this.lastSummary = null;
    },

    countSections(payload: OfflinePayload): number {
      const ids = new Set<number>();
      payload.base.PolicySection.forEach((row) => ids.add(row.id));
      payload.remote.PolicySection.forEach((row) => ids.add(row.id));
      return ids.size;
    },

    mergeItems(existing: OfflineMergeBatch["items"], incoming: OfflineMergeBatch["items"]): OfflineMergeBatch["items"] {
      const map = new Map(existing.map((item) => [item.entity_id, item]));
      incoming.forEach((item) => {
        if (!map.has(item.entity_id)) map.set(item.entity_id, item);
      });
      return [...map.values()];
    },

    async appendConflicts(batchId: number, incoming: MergeConflict[]) {
      const existing = await listMergeConflicts();
      const seen = new Set(existing.map((c) => `${c.entity_type}:${c.entity_id}:${c.field}`));
      let nextId = Math.max(0, ...existing.map((c) => c.id)) + 1;
      for (const conflict of incoming) {
        const key = `${conflict.entity_type}:${conflict.entity_id}:${conflict.field}`;
        if (seen.has(key)) continue;
        seen.add(key);
        conflict.id = nextId++;
        await saveMergeConflict(conflict);
      }
    },

    async nextBatchId(): Promise<number> {
      const rows = await listMergeBatches();
      return Math.max(0, ...rows.map((row) => row.id)) + 1;
    }
  }
});
