import { runMerge, applyMerge } from "../src/utils/mergeEngine";
import { buildSampleScenario } from "../src/utils/sampleScenario";
import { mockData } from "../src/mocks/seedData";
import type { PolicySection } from "../src/types/PolicySection";
import type { DiffResult } from "../src/types/DiffResult";
import type { ReviewNote } from "../src/types/ReviewNote";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

const localSections = mockData.policySection as unknown as PolicySection[];
const localDiffs = mockData.diffResult as unknown as DiffResult[];
const localNotes = mockData.reviewNote as unknown as ReviewNote[];
const scenario = buildSampleScenario(localSections, localDiffs, localNotes);

// 第一次合并：处理全部条款
const local1 = {
  PolicySection: scenario.localOverrides.PolicySection,
  DiffResult: localDiffs.map((r) => ({ ...r })),
  ReviewNote: localNotes.map((r) => ({ ...r }))
};
const first = runMerge(local1, scenario.payload, 1, "2026-10-07T00:00:00Z");
const afterFirst = applyMerge(local1, first);

console.log("=== 第一次合并 ===");
assert(afterFirst.PolicySection.length === 4, `第一次合并后条款数: ${afterFirst.PolicySection.length}`);
assert(first.items.length === 4, `第一次处理条款数: ${first.items.length}`);

// 模拟中断：只处理了前 2 个条款（id=1,2），保留批次
// 第二次（续传）：skipSectionIds = {1,2}，只处理 3,4
const skip = new Set([1, 2]);
const second = runMerge(afterFirst, scenario.payload, 1, "2026-10-07T00:00:01Z", {}, { skipSectionIds: skip });

console.log("\n=== 续传：跳过已合并条款 ===");
const processedIds = second.items.map((i) => i.entity_id).sort();
assert(processedIds.length === 2, `续传只处理未合完条款: ${processedIds.join(",")}`);
assert(processedIds[0] === 3 && processedIds[1] === 4, `续传处理的是条款 3,4: ${processedIds.join(",")}`);

const afterSecond = applyMerge(afterFirst, second);
assert(afterSecond.PolicySection.length === 4, `续传后条款数仍为 4（无重复）: ${afterSecond.PolicySection.length}`);
assert(afterSecond.DiffResult.length === 4, `续传后差异数仍为 4（无重复）: ${afterSecond.DiffResult.length}`);
assert(afterSecond.ReviewNote.length === 4, `续传后备注数仍为 4（无重复）: ${afterSecond.ReviewNote.length}`);

// 已合并条款 1 的字段级合并结果在续传后保持
const s1 = afterSecond.PolicySection.find((s) => s.id === 1)!;
assert(s1.heading === "heading 1（本地修订）" && s1.content === "content 1（离线补充）", "续传后条款1 字段级合并结果保持");

// 条款 3 的差异在续传时重算（因为条款 3 未跳过）
const d3 = afterSecond.DiffResult.find((d) => d.section_id === 3)!;
assert(d3.diff_type === "MODIFIED", `续传后条款3 差异类型: ${d3.diff_type}`);
const n3 = afterSecond.ReviewNote.find((n) => n.diff_result_id === d3.id)!;
assert(n3.status === "PENDING_REVIEW", `续传后条款3 备注待复核: ${n3.status}`);

console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);
