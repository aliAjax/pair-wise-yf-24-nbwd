/**
 * 离线合并逻辑验证脚本（Node 运行，localStore 自动走内存回退）。
 * 运行方式：node_modules/.bin/esbuild scripts/verifyMerge.ts --bundle --platform=node --format=esm --outfile=/tmp/verifyMerge.mjs && node /tmp/verifyMerge.mjs
 */
import { resetAllTables, readTable } from "../src/utils/localStore";
import { ensureSeeded, applyLocalEdit, mergeOfflineChangeSet } from "../src/utils/mergeEngine";
import { buildSampleOfflineChangeSet, LOCAL_EDITS_DURING_TRIP } from "../src/mocks/offlineSample";
import { TABLE_NAMES } from "../src/constants/storageKeys";
import type { StampedRow } from "../src/types/FieldChange";
import type { PolicySection } from "../src/types/PolicySection";
import type { DiffResult } from "../src/types/DiffResult";
import type { ReviewNote } from "../src/types/ReviewNote";
import type { MergeBatch } from "../src/types/MergeBatch";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

const sections = () => readTable<StampedRow<PolicySection>>(TABLE_NAMES.PolicySection);
const diffs = () => readTable<StampedRow<DiffResult>>(TABLE_NAMES.DiffResult);
const notes = () => readTable<StampedRow<ReviewNote>>(TABLE_NAMES.ReviewNote);
const batches = () => readTable<MergeBatch>(TABLE_NAMES.MergeBatch);
const section = (id: number) => sections().find((row) => row.data.id === id)?.data;
const diff = (id: number) => diffs().find((row) => row.data.id === id)?.data;
const note = (id: number) => notes().find((row) => row.data.id === id)?.data;

function applyLocalEdits() {
  for (const edit of LOCAL_EDITS_DURING_TRIP) {
    applyLocalEdit(edit.table as never, edit.id, edit.patch as never, edit.edited_at);
  }
}

async function scenarioA() {
  console.log("\n场景 A：字段级双向合并 + 正文变化触发重算与待复核");
  resetAllTables();
  ensureSeeded();
  applyLocalEdits();
  const report = await mergeOfflineChangeSet(buildSampleOfflineChangeSet());

  assert(report.status === "COMPLETED", "合并完成");

  const s1 = section(1);
  assert(s1?.content.includes("离线修订") === true, "section1.content 采用离线修改");
  assert(s1?.heading.includes("内网修订版") === true, "section1.heading 保留本地修改（整行未覆盖）");
  assert(s1?.risk_level === "HIGH", "section1.risk_level 采用离线修改");

  const d1 = diff(1);
  assert(d1?.summary.includes("重算") === true, "diff1 因正文变化失效重算");
  assert(d1?.diff_type === "MODIFIED", "diff1 重算结果为 MODIFIED");
  const n1 = note(1);
  assert(n1?.status === "PENDING_RECHECK", "note1 转为待复核");
  assert(n1?.comment === "comment 1", "note1 保留备注原文");

  const n2 = note(2);
  assert(n2?.status === "PENDING_RECHECK" && n2.comment === "comment 2", "note2 转待复核且原文保留");

  const s3 = section(3);
  assert(s3?.content === "content 3", "section3 未被离线包改动");
  const d3 = diff(3);
  assert(d3?.summary.includes("离线补充说明") === true, "diff3.summary 采用离线修改");
  assert(d3?.diff_type === "UNCHANGED", "diff3.diff_type 保留本地修改");
  assert(d3?.summary.includes("重算") === false, "diff3 正文未变，不重算");
  const n3 = note(3);
  assert(n3?.comment.includes("离线补充意见") === true, "note3.comment 采用离线修改");
  assert(n3?.status === "RESOLVED", "note3.status 保留本地修改（不转待复核）");

  assert(section(4)?.heading === "四、离线新增条款", "section4 离线新建记录已合并");
  assert(diff(4)?.diff_type === "ADDED", "diff4 已合并");
  assert(note(4)?.comment === "离线新增备注", "note4 已合并");
  assert(sections().length === 4 && diffs().length === 4 && notes().length === 4, "记录总数 4/4/4");
}

async function scenarioB() {
  console.log("\n场景 B：合并中断保留批次，重试只处理未合并条款");
  resetAllTables();
  ensureSeeded();
  applyLocalEdits();

  let processed = 0;
  const first = await mergeOfflineChangeSet(buildSampleOfflineChangeSet(), {
    shouldAbort: () => processed >= 1,
    onItemMerged: () => { processed += 1; }
  });
  assert(first.status === "INTERRUPTED", "首次合并被中断");
  const interruptedBatch = batches().find((b) => b.batch_no === "OFFLINE-2026-0630");
  assert(interruptedBatch?.status === "INTERRUPTED", "中断批次已保留");
  assert(interruptedBatch?.merged_ids.length === 1, "检查点记录已合并 1 条条款");

  const resumed = await mergeOfflineChangeSet(buildSampleOfflineChangeSet());
  assert(resumed.status === "COMPLETED", "重试后合并完成");
  assert(resumed.item_outcomes.length === 4, "累计处理 4 条条款");
  assert(
    resumed.sections.updated.filter((id) => id === 1).length === 1,
    "section1 只被合并一次（重试跳过已完成条款）"
  );
  assert(section(1)?.content.includes("离线修订") === true, "续跑后 section1.content 正确");
  assert(section(4)?.heading === "四、离线新增条款", "续跑后 section4 已合并");
  assert(note(1)?.status === "PENDING_RECHECK", "续跑后 note1 待复核");
  assert(sections().length === 4 && diffs().length === 4 && notes().length === 4, "续跑后记录总数 4/4/4");
}

async function scenarioC() {
  console.log("\n场景 C：同一批次重复导入不多出记录");
  const before = { s: sections().length, d: diffs().length, n: notes().length, b: batches().length };
  const again = await mergeOfflineChangeSet(buildSampleOfflineChangeSet());
  assert(again.logs.some((log) => log.includes("重复导入")), "重复导入被识别并跳过");
  assert(
    sections().length === before.s && diffs().length === before.d && notes().length === before.n,
    "重复导入后记录数不变"
  );
  assert(batches().length === before.b, "批次表不产生新批次");
}

async function scenarioD() {
  console.log("\n场景 D：换批次号重复投递相同内容，记录级幂等");
  const retry = buildSampleOfflineChangeSet();
  retry.batch_no = "OFFLINE-2026-0630-RETRY";
  const report = await mergeOfflineChangeSet(retry);
  assert(report.sections.inserted.length === 0, "无重复插入条款");
  assert(report.diff_results.inserted.length === 0, "无重复插入差异");
  assert(report.review_notes.inserted.length === 0, "无重复插入备注");
  assert(sections().length === 4 && diffs().length === 4 && notes().length === 4, "记录总数仍为 4/4/4");
  const s1 = section(1);
  assert(s1?.heading.includes("内网修订版") === true && s1.content.includes("离线修订"), "重复投递后双方修改仍各自保留");
}

async function main() {
  await scenarioA();
  await scenarioB();
  await scenarioC();
  await scenarioD();
  console.log(`\n结果：${passed} 通过，${failed} 失败`);
  if (failed > 0) process.exit(1);
}

main();
