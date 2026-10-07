<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useOfflineMerge } from "../hooks/useOfflineMerge";
import { applyLocalEdit, ensureSeeded } from "../utils/mergeEngine";
import { buildSampleOfflineChangeSet, LOCAL_EDITS_DURING_TRIP } from "../mocks/offlineSample";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { useMergeBatchStore } from "../stores/MergeBatchStore";
import { formatFieldSource } from "../utils/formatters";
import MergeProgress from "../components/common/MergeProgress.vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import type { OfflineChangeSet } from "../types/OfflineChangeSet";
import type { PolicySection } from "../types/PolicySection";
import type { DiffResult } from "../types/DiffResult";
import type { ReviewNote } from "../types/ReviewNote";

const sectionStore = usePolicySectionStore();
const noteStore = useReviewNoteStore();
const batchStore = useMergeBatchStore();
const { running, report, progress, error, run, abort } = useOfflineMerge();

const changeSet = ref<OfflineChangeSet | null>(null);
const localEditsApplied = ref(false);
const fieldSources = ref<Record<string, Record<string, string>>>({});

async function refresh() {
  await Promise.all([sectionStore.load(), noteStore.load(), batchStore.load()]);
}

function applyLocalEdits() {
  for (const edit of LOCAL_EDITS_DURING_TRIP) {
    if (edit.table === "policySection") applyLocalEdit<PolicySection>(edit.table, edit.id, edit.patch, edit.edited_at);
    else if (edit.table === "diffResult") applyLocalEdit<DiffResult>(edit.table, edit.id, edit.patch, edit.edited_at);
    else applyLocalEdit<ReviewNote>(edit.table, edit.id, edit.patch, edit.edited_at);
  }
  localEditsApplied.value = true;
  refresh();
}

function importSample() {
  changeSet.value = buildSampleOfflineChangeSet();
}

async function startMerge() {
  if (!changeSet.value) importSample();
  const result = await run(changeSet.value as OfflineChangeSet);
  fieldSources.value = result.field_sources;
  await refresh();
}

onMounted(() => {
  ensureSeeded();
  refresh();
});
</script>

<template>
  <section class="merge-page">
    <div class="panel wide">
      <h2>离线合并操作</h2>
      <p class="hint">演示流程：① 模拟出差期间内网同事的本地修改 → ② 导入笔记本上的离线变更包 → ③ 执行合并。合并支持中断续跑，同一批次重复导入不会产生重复记录。</p>
      <div class="actions">
        <button :disabled="localEditsApplied" @click="applyLocalEdits">① 模拟本地修改{{ localEditsApplied ? "（已应用）" : "" }}</button>
        <button :disabled="!!changeSet" @click="importSample">② 导入示例离线包{{ changeSet ? "（已导入）" : "" }}</button>
        <button :disabled="running || !changeSet" @click="startMerge">③ {{ batchStore.rows.some((b) => b.status === "INTERRUPTED") ? "重试续跑" : "开始合并" }}</button>
        <button :disabled="!running" @click="abort">模拟中断</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <MergeProgress v-if="report" :report="report" :done="progress.done" :total="progress.total" />

    <div class="panel wide" v-if="report">
      <h2>合并后条款（字段来源）</h2>
      <table class="merge-table">
        <thead><tr><th>ID</th><th>标题</th><th>正文</th><th>风险</th><th>字段来源</th></tr></thead>
        <tbody>
          <tr v-for="section in sectionStore.rows" :key="section.id">
            <td>{{ section.id }}</td>
            <td>{{ section.heading }}</td>
            <td class="content-cell">{{ section.content }}</td>
            <td>{{ section.risk_level }}</td>
            <td>
              <span v-for="(source, field) in fieldSources[`PolicySection:${section.id}`] ?? {}" :key="field" class="badge" :class="`source-${String(source).toLowerCase()}`">
                {{ field }}: {{ formatFieldSource(String(source)) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel wide" v-if="report">
      <h2>审阅备注状态</h2>
      <table class="merge-table">
        <thead><tr><th>ID</th><th>差异</th><th>备注</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="note in noteStore.rows" :key="note.id">
            <td>{{ note.id }}</td>
            <td>#{{ note.diff_result_id }}</td>
            <td class="content-cell">{{ note.comment }}</td>
            <td><StatusBadge :value="note.status" /></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel" v-if="batchStore.rows.length">
      <h2>合并批次</h2>
      <article class="row" v-for="batch in batchStore.rows" :key="batch.batch_no">
        <strong>{{ batch.batch_no }}</strong>
        <span>{{ batch.merged_count }}/{{ batch.total_count }} 条款</span>
        <StatusBadge :value="batch.status" />
      </article>
    </div>
  </section>
</template>
