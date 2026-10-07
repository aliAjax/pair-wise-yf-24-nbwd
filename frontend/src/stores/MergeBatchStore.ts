import { defineStore } from "pinia";
import { listMergeBatch } from "../api/MergeBatch";
export const useMergeBatchStore = defineStore("mergeBatch", {
  state: () => ({ rows: [] as Awaited<ReturnType<typeof listMergeBatch>>, loading: false }),
  actions: { async load() { this.loading = true; this.rows = await listMergeBatch(); this.loading = false; } }
});
