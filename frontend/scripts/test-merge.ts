import { runMerge, applyMerge } from "../src/utils/mergeEngine";
import { buildSampleScenario } from "../src/utils/sampleScenario";
import { mockData } from "../src/mocks/seedData";
import type { PolicySection } from "../src/types/PolicySection";
import type { DiffResult } from "../src/types/DiffResult";
import type { ReviewNote } from "../src/types/ReviewNote";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

const localSections = mockData.policySection as unknown as PolicySection[];
const localDiffs = mockData.diffResult as unknown as DiffResult[];
const localNotes = mockData.reviewNote as unknown as ReviewNote[];

const scenario = buildSampleScenario(localSections, localDiffs, localNotes);
// 应用本地分歧
const local = {
  PolicySection: scenario.localOverrides.PolicySection,
  DiffResult: localDiffs.map((r) => ({ ...r })),
  ReviewNote: localNotes.map((r) => ({ ...r }))
};

const output = runMerge(local, scenario.payload, 1, "2026-10-07T00:00:00Z");

console.log("\n=== 字段级合并（两边各改不同字段）===");
const s1 = output.sections.find((s) => s.id === 1)!;
assert(s1.heading === "heading 1（本地修订）", `条款1 heading 保留本地修改: "${s1.heading}"`);
assert(s1.content === "content 1（离线补充）", `条款1 content 保留离线修改: "${s1.content}"`);

console.log("\n=== 字段级冲突（两边改同一字段不同值）===");
const s2 = output.sections.find((s) => s.id === 2)!;
assert(s2.content === "content 2（本地改）", `条款2 content 默认取本地: "${s2.content}"`);
const conflict = output.conflicts.find((c) => c.entity_id === 2 && c.field === "content");
assert(!!conflict, "条款2 content 产生冲突记录");
assert(conflict?.local_value === "content 2（本地改）", "冲突记录本地值");
assert(conflict?.remote_value === "content 2（离线改）", "冲突记录离线值");
assert(conflict?.resolution === "PENDING", "冲突状态待裁决");

console.log("\n=== 差异失效重算 ===");
const s3 = output.sections.find((s) => s.id === 3)!;
assert(s3.content === "content 3（离线更新正文）", `条款3 content 取离线: "${s3.content}"`);
const d3 = output.diffResults.find((d) => d.section_id === 3)!;
assert(output.invalidatedDiffIds.includes(d3.id), "条款3 差异结果被标记失效");
assert(d3.diff_type === "MODIFIED", `条款3 差异类型重算为 MODIFIED: "${d3.diff_type}"`);
assert(d3.summary.includes("修改"), `条款3 差异摘要重算: "${d3.summary}"`);

console.log("\n=== 审阅备注转待复核（保留原文）===");
const n3 = output.reviewNotes.find((n) => n.diff_result_id === d3.id)!;
assert(n3.status === "PENDING_REVIEW", `条款3 备注状态转待复核: "${n3.status}"`);
assert(n3.comment === "comment 3", `条款3 备注原文保留: "${n3.comment}"`);
assert(output.invalidatedNoteIds.includes(n3.id), "条款3 备注被标记待复核");

console.log("\n=== 离线新增条款 ===");
const s4 = output.sections.find((s) => s.section_no === "section no 4")!;
assert(!!s4, "离线新增条款4 存在");
assert(s4.id === 4, `条款4 分配新本地 id: ${s4.id}`);
const d4 = output.diffResults.find((d) => d.section_id === s4.id)!;
assert(!!d4, "条款4 差异结果存在并重映射 section_id");
assert(d4.diff_type === "ADDED", `条款4 差异类型 ADDED: "${d4.diff_type}"`);
const n4 = output.reviewNotes.find((n) => n.diff_result_id === d4.id)!;
assert(!!n4, "条款4 备注存在并重映射 diff_result_id");
assert(n4.comment === "comment 4（离线新增备注）", `条款4 备注内容: "${n4.comment}"`);

console.log("\n=== 幂等/无重复 ===");
const merged = applyMerge(local, output);
assert(merged.PolicySection.length === 4, `合并后条款数为 4（原3 + 新增1）: ${merged.PolicySection.length}`);
assert(merged.DiffResult.length === 4, `合并后差异数为 4: ${merged.DiffResult.length}`);
assert(merged.ReviewNote.length === 4, `合并后备注数为 4: ${merged.ReviewNote.length}`);
const s1Again = merged.PolicySection.find((s) => s.id === 1)!;
assert(s1Again.heading === "heading 1（本地修订）" && s1Again.content === "content 1（离线补充）", "applyMerge 后条款1 字段级合并结果保持");

console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);
