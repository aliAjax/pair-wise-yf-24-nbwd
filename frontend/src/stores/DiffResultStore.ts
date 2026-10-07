import { defineStore } from "pinia";
import { listDiffResult } from "../api/DiffResult";
export const useDiffResultStore = defineStore("diffResult", {
  state: () => ({ rows: [] as Awaited<ReturnType<typeof listDiffResult>>, loading: false }),
  actions: { async load() { this.loading = true; this.rows = await listDiffResult(); this.loading = false; } }
});
