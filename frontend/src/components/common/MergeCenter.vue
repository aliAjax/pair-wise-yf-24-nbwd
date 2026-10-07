<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useOfflineMergeStore } from "../../stores/OfflineMergeStore";
import { formatDate, formatMergeStatus, formatEntityType, formatConflictResolution } from "../../utils/formatters";
import type { OfflinePayload } from "../../types/OfflineMergeBatch";

const store = useOfflineMergeStore();
const { batches, conflicts, loading, lastSummary, pendingConflicts } = storeToRefs(store);

const payloadText = ref("");
const sourceDevice = ref("laptop-zhangwei");
const importError = ref("");
const importSuccess = ref("");

onMounted(() => {
  void store.loadAll();
});

const sortedBatches = computed(() =>
  [...batches.value].sort((a, b) => (a.imported_at < b.imported_at ? 1 : -1))
);

function parsePayload(): OfflinePayload | null {
  try {
    const parsed = JSON.parse(payloadText.value) as OfflinePayload;
    if (!parsed.base || !parsed.remote) {
      importError.value = "离线包格式错误：缺少 base 或 remote 数据";
      return null;
    }
    importError.value = "";
    return parsed;
  } catch {
    importError.value = "离线包不是合法 JSON";
    return null;
  }
}

async function handleImport() {
  importError.value = "";
  importSuccess.value = "";
  const payload = parsePayload();
  if (!payload) return;
  const result = await store.importBatch(payload, sourceDevice.value || "unknown-device");
  if (result.status === "duplicated") {
    importSuccess.value = `该批次已导入（批次号 ${result.batch.batch_no}），重复导入未产生新记录`;
  } else if (result.status === "resumed") {
    importSuccess.value = `已续传中断批次 ${result.batch.batch_no}`;
  } else {
    importSuccess.value = `已导入并合并批次 ${result.batch.batch_no}`;
  }
}

async function handleSample() {
  importError.value = "";
  importSuccess.value = "";
  const result = await store.importSampleScenario();
  if (result.status === "duplicated") {
    importSuccess.value = `示例批次已存在（批次号 ${result.batch.batch_no}），未重复导入`;
  } else {
    importSuccess.value = `已生成示例场景并合并（批次号 ${result.batch.batch_no}）`;
  }
}

async function handleExport() {
  const payload = await store.exportOfflinePackage();
  payloadText.value = JSON.stringify(payload, null, 2);
  importSuccess.value = "已导出当前本地数据为离线包（base 与 remote 相同，离线审阅后可带回合并）";
}

async function handleReset() {
  if (!confirm("确定要清空所有本地合并数据并重置为种子数据吗？")) return;
  await store.resetAll();
  importSuccess.value = "已重置本地数据";
}

function progress(batch: { processed_items: number; total_items: number }): number {
  if (batch.total_items === 0) return 0;
  return Math.round((batch.processed_items / batch.total_items) * 100);
}

function conflictLabel(conflict: { entity_type: string; entity_id: number; field: string }): string {
  return `${formatEntityType(conflict.entity_type)} #${conflict.entity_id} · ${conflict.field}`;
}
</script>

<template>
  <div class="merge-center">
    <section class="panel">
      <div class="panel-head">
        <h2>离线包导入</h2>
        <div class="actions">
          <el-button size="small" @click="handleExport">导出当前数据为离线包</el-button>
          <el-button size="small" type="success" @click="handleSample">生成示例场景</el-button>
          <el-button size="small" type="danger" plain @click="handleReset">重置本地数据</el-button>
        </div>
      </div>
      <p class="hint">
        法务同事在笔记本上离线审政策，回到内网后把离线包粘贴到下方合并。合并按字段来源保留双方修改，
        条款正文变化会触发差异重算与备注待复核；中断后可续传，重复导入不会多出记录。
      </p>
      <el-input
        v-model="payloadText"
        type="textarea"
        :rows="8"
        placeholder="粘贴离线包 JSON（含 base 与 remote）"
      />
      <div class="import-row">
        <el-input v-model="sourceDevice" placeholder="来源设备标识" style="max-width: 240px" />
        <el-button type="primary" :loading="loading" @click="handleImport">导入并合并</el-button>
      </div>
      <el-alert v-if="importError" :title="importError" type="error" show-icon :closable="false" />
      <el-alert v-if="importSuccess" :title="importSuccess" type="success" show-icon :closable="false" />
    </section>

    <section v-if="lastSummary" class="panel">
      <h2>最近合并结果</h2>
      <div class="summary-grid">
        <div class="summary-item"><span>新增条款</span><strong>{{ lastSummary.addedSections }}</strong></div>
        <div class="summary-item"><span>差异失效重算</span><strong>{{ lastSummary.invalidatedDiffs }}</strong></div>
        <div class="summary-item"><span>备注转待复核</span><strong>{{ lastSummary.pendingReviewNotes }}</strong></div>
        <div class="summary-item"><span>字段冲突</span><strong>{{ lastSummary.conflicts }}</strong></div>
        <div class="summary-item"><span>是否中断</span><strong>{{ lastSummary.interrupted ? "是" : "否" }}</strong></div>
        <div class="summary-item"><span>重复导入</span><strong>{{ lastSummary.duplicated ? "是" : "否" }}</strong></div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>合并批次</h2>
        <el-tag v-if="pendingConflicts.length" type="warning">{{ pendingConflicts.length }} 项冲突待裁决</el-tag>
      </div>
      <el-table :data="sortedBatches" stripe empty-text="暂无批次">
        <el-table-column prop="batch_no" label="批次号" min-width="220" show-overflow-tooltip />
        <el-table-column prop="source_device" label="来源设备" width="160" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'COMPLETED' ? 'success' : row.status === 'INTERRUPTED' ? 'warning' : 'info'">
              {{ formatMergeStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="180">
          <template #default="{ row }">
            <el-progress :percentage="progress(row)" :stroke-width="10" />
            <span class="progress-text">{{ row.processed_items }} / {{ row.total_items }}</span>
          </template>
        </el-table-column>
        <el-table-column label="导入时间" width="180">
          <template #default="{ row }">{{ formatDate(row.imported_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'INTERRUPTED'"
              size="small"
              type="primary"
              @click="store.resumeBatch(row.id)"
            >续传</el-button>
            <el-button
              v-if="row.status === 'IN_PROGRESS'"
              size="small"
              type="warning"
              @click="store.interrupt()"
            >中断</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="panel">
      <h2>字段冲突裁决</h2>
      <el-table :data="conflicts" stripe empty-text="暂无冲突">
        <el-table-column label="冲突项" min-width="220">
          <template #default="{ row }">{{ conflictLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="基线值" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.base_value }}</template>
        </el-table-column>
        <el-table-column label="本地值" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.local_value }}</template>
        </el-table-column>
        <el-table-column label="离线值" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.remote_value }}</template>
        </el-table-column>
        <el-table-column label="裁决" width="220">
          <template #default="{ row }">
            <template v-if="row.resolution === 'PENDING'">
              <el-button size="small" @click="store.resolveConflict(row.id, 'LOCAL')">保留本地</el-button>
              <el-button size="small" type="primary" @click="store.resolveConflict(row.id, 'REMOTE')">保留离线</el-button>
            </template>
            <el-tag v-else type="success">已{{ formatConflictResolution(row.resolution) }}：{{ row.resolved_value }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<style scoped>
.merge-center { display: grid; gap: 18px; }
.panel { background: #fbfaf4; border: 1px solid #d8d6c8; border-radius: 8px; padding: 18px; display: grid; gap: 12px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.panel h2 { margin: 0; font-size: 18px; }
.hint { margin: 0; color: #596257; font-size: 13px; line-height: 1.6; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.import-row { display: flex; gap: 8px; align-items: center; }
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
.summary-item { background: #eef1e8; border-radius: 6px; padding: 12px; display: grid; gap: 4px; }
.summary-item span { color: #596257; font-size: 12px; }
.summary-item strong { font-size: 22px; color: #274335; }
.progress-text { font-size: 12px; color: #596257; }
</style>
