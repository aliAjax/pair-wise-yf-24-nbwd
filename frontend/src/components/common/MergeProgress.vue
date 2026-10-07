<script setup lang="ts">
import StatusBadge from "./StatusBadge.vue";
import type { MergeReport } from "../../types/MergeReport";

defineProps<{ report: MergeReport; done: number; total: number }>();
</script>

<template>
  <div class="panel">
    <h2>合并进度 <StatusBadge :value="report.status" /></h2>
    <p>批次号：{{ report.batch_no }} ｜ 已处理 {{ done }} / {{ total }} 条款</p>
    <div class="progress-track">
      <div class="progress-bar" :style="{ width: total ? `${Math.round((done / total) * 100)}%` : '0%' }" />
    </div>
    <ul class="report-stats">
      <li>条款段落：新增 {{ report.sections.inserted.length }}，更新 {{ report.sections.updated.length }}</li>
      <li>差异结果：新增 {{ report.diff_results.inserted.length }}，更新 {{ report.diff_results.updated.length }}，重算 {{ report.diff_results.recalculated.length }}</li>
      <li>审阅备注：新增 {{ report.review_notes.inserted.length }}，更新 {{ report.review_notes.updated.length }}，转待复核 {{ report.review_notes.pending_recheck.length }}</li>
    </ul>
    <details v-if="report.logs.length">
      <summary>合并日志（{{ report.logs.length }}）</summary>
      <ul class="report-logs"><li v-for="(log, index) in report.logs" :key="index">{{ log }}</li></ul>
    </details>
  </div>
</template>
