import { defineStore } from "pinia";
import { listReviewNote } from "../api/ReviewNote";
export const useReviewNoteStore = defineStore("reviewNote", {
  state: () => ({ rows: [] as Awaited<ReturnType<typeof listReviewNote>>, loading: false }),
  actions: { async load() { this.loading = true; this.rows = await listReviewNote(); this.loading = false; } }
});
