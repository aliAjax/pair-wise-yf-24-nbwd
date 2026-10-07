import { mockData } from "../mocks/seedData";
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
  return [...(mockData.reviewNote as unknown as ReviewNote[])];
}

export async function saveReviewNote(payload: ReviewNote) {
  console.info("save ReviewNote", payload);
  return payload;
}
