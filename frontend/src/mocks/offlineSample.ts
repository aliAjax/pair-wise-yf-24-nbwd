import type { OfflineChangeSet } from "../types/OfflineChangeSet";
import { TABLE_NAMES } from "../constants/storageKeys";

/**
 * 演示场景：法务出差期间（06-11 导出基线后）
 * - 内网同事在本地改了 section1.heading / diff3.diff_type / note3.status（06-20）
 * - 笔记本上离线改了 section1.content+risk_level、section2.content、
 *   diff3.summary、note3.comment，并新建了 section4 及其差异与备注（06-15 ~ 06-18）
 * 合并时应看到：双方修改按字段各自保留，正文变化的条款差异重算、备注转待复核。
 */
export const LOCAL_EDITS_DURING_TRIP = [
  {
    table: TABLE_NAMES.PolicySection,
    id: 1,
    patch: { heading: "一、信息收集（内网修订版）" },
    edited_at: "2026-06-20T09:00:00Z"
  },
  {
    table: TABLE_NAMES.DiffResult,
    id: 3,
    patch: { diff_type: "UNCHANGED" },
    edited_at: "2026-06-20T09:05:00Z"
  },
  {
    table: TABLE_NAMES.ReviewNote,
    id: 3,
    patch: { status: "RESOLVED" },
    edited_at: "2026-06-20T09:10:00Z"
  }
] as const;

export function buildSampleOfflineChangeSet(): OfflineChangeSet {
  return {
    batch_no: "OFFLINE-2026-0630",
    source_device: "法务笔记本-01",
    exported_at: "2026-06-30T18:00:00Z",
    sections: [
      {
        record: {
          id: 1,
          document_id: 1,
          section_no: "section no 1",
          heading: "一、信息收集",
          content: "content 1（离线修订：补充生物识别信息收集说明）",
          category: "REMOVED",
          risk_level: "HIGH"
        },
        field_changes: [
          { field: "content", value: "content 1（离线修订：补充生物识别信息收集说明）", updated_at: "2026-06-15T10:00:00Z" },
          { field: "risk_level", value: "HIGH", updated_at: "2026-06-16T10:00:00Z" }
        ]
      },
      {
        record: {
          id: 2,
          document_id: 2,
          section_no: "section no 2",
          heading: "heading 2",
          content: "content 2（离线重写：明确数据共享第三方清单）",
          category: "MODIFIED",
          risk_level: "MEDIUM"
        },
        field_changes: [
          { field: "content", value: "content 2（离线重写：明确数据共享第三方清单）", updated_at: "2026-06-17T10:00:00Z" }
        ]
      },
      {
        record: {
          id: 3,
          document_id: 3,
          section_no: "section no 3",
          heading: "heading 3",
          content: "content 3",
          category: "MOVED",
          risk_level: "HIGH"
        },
        field_changes: []
      },
      {
        record: {
          id: 4,
          document_id: 1,
          section_no: "section no 4",
          heading: "四、离线新增条款",
          content: "offline new content 4",
          category: "ADDED",
          risk_level: "LOW"
        },
        field_changes: [
          { field: "document_id", value: 1, updated_at: "2026-06-18T09:00:00Z" },
          { field: "section_no", value: "section no 4", updated_at: "2026-06-18T09:00:00Z" },
          { field: "heading", value: "四、离线新增条款", updated_at: "2026-06-18T09:00:00Z" },
          { field: "content", value: "offline new content 4", updated_at: "2026-06-18T09:00:00Z" },
          { field: "category", value: "ADDED", updated_at: "2026-06-18T09:00:00Z" },
          { field: "risk_level", value: "LOW", updated_at: "2026-06-18T09:00:00Z" }
        ]
      }
    ],
    diff_results: [
      {
        record: {
          id: 3,
          old_document_id: 3,
          new_document_id: 3,
          section_id: 3,
          diff_type: "MOVED",
          summary: "summary 3（离线补充说明）",
          created_at: "2026-06-13T09:00:00Z"
        },
        field_changes: [
          { field: "summary", value: "summary 3（离线补充说明）", updated_at: "2026-06-15T11:00:00Z" }
        ]
      },
      {
        record: {
          id: 4,
          old_document_id: 1,
          new_document_id: 2,
          section_id: 4,
          diff_type: "ADDED",
          summary: "离线新增条款差异",
          created_at: "2026-06-18T09:00:00Z"
        },
        field_changes: [
          { field: "old_document_id", value: 1, updated_at: "2026-06-18T09:00:00Z" },
          { field: "new_document_id", value: 2, updated_at: "2026-06-18T09:00:00Z" },
          { field: "section_id", value: 4, updated_at: "2026-06-18T09:00:00Z" },
          { field: "diff_type", value: "ADDED", updated_at: "2026-06-18T09:00:00Z" },
          { field: "summary", value: "离线新增条款差异", updated_at: "2026-06-18T09:00:00Z" },
          { field: "created_at", value: "2026-06-18T09:00:00Z", updated_at: "2026-06-18T09:00:00Z" }
        ]
      }
    ],
    review_notes: [
      {
        record: {
          id: 3,
          diff_result_id: 3,
          tag: "tag 3",
          comment: "comment 3（离线补充意见）",
          reviewer: "reviewer 3",
          status: "OPEN"
        },
        field_changes: [
          { field: "comment", value: "comment 3（离线补充意见）", updated_at: "2026-06-16T11:00:00Z" }
        ]
      },
      {
        record: {
          id: 4,
          diff_result_id: 4,
          tag: "tag 4",
          comment: "离线新增备注",
          reviewer: "reviewer 1",
          status: "OPEN"
        },
        field_changes: [
          { field: "diff_result_id", value: 4, updated_at: "2026-06-18T09:00:00Z" },
          { field: "tag", value: "tag 4", updated_at: "2026-06-18T09:00:00Z" },
          { field: "comment", value: "离线新增备注", updated_at: "2026-06-18T09:00:00Z" },
          { field: "reviewer", value: "reviewer 1", updated_at: "2026-06-18T09:00:00Z" },
          { field: "status", value: "OPEN", updated_at: "2026-06-18T09:00:00Z" }
        ]
      }
    ]
  };
}
