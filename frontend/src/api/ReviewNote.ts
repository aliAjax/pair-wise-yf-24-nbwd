import { mockData } from "../mocks/seedData";
import type { ReviewNote } from "../types/ReviewNote";
import { readStore, writeStore } from "../utils/localStorage";

const endpoint = "/api/review-note";
const STORE_KEY = "review-note";

export async function listReviewNote(): Promise<ReviewNote[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  return readStore<ReviewNote[]>(STORE_KEY, () => [...(mockData.reviewNote as unknown as ReviewNote[])]);
}

export async function saveReviewNote(payload: ReviewNote): Promise<ReviewNote> {
  const rows = await listReviewNote();
  const index = rows.findIndex((row) => row.id === payload.id);
  if (index >= 0) rows[index] = payload;
  else rows.push(payload);
  writeStore(STORE_KEY, rows);
  console.info("save ReviewNote", payload);
  return payload;
}
