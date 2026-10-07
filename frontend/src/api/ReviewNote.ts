import { mockData } from "../mocks/seedData";
import { TABLE_NAMES } from "../constants/storageKeys";
import { ensureTableSeeded, readTable, writeTable } from "../utils/localStore";
import type { StampedRow } from "../types/FieldChange";
import type { ReviewNote } from "../types/ReviewNote";

const endpoint = "/api/review-note";

export async function listReviewNote(): Promise<ReviewNote[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  ensureTableSeeded(TABLE_NAMES.ReviewNote, mockData.reviewNote as unknown as ReviewNote[]);
  return readTable<StampedRow<ReviewNote>>(TABLE_NAMES.ReviewNote).map((row) => ({ ...row.data }));
}

export async function saveReviewNote(payload: ReviewNote) {
  console.info("save ReviewNote", payload);
  ensureTableSeeded(TABLE_NAMES.ReviewNote, mockData.reviewNote as unknown as ReviewNote[]);
  const rows = readTable<StampedRow<ReviewNote>>(TABLE_NAMES.ReviewNote);
  const index = rows.findIndex((row) => row.data.id === payload.id);
  const stamp = new Date().toISOString();
  const next: StampedRow<ReviewNote> = {
    data: payload,
    field_timestamps: Object.fromEntries(Object.keys(payload).map((field) => [field, stamp]))
  };
  if (index >= 0) rows[index] = next;
  else rows.push(next);
  writeTable(TABLE_NAMES.ReviewNote, rows);
  return payload;
}
