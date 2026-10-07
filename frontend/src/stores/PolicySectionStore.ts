import { defineStore } from "pinia";
import { listPolicySection } from "../api/PolicySection";
export const usePolicySectionStore = defineStore("policySection", {
  state: () => ({ rows: [] as Awaited<ReturnType<typeof listPolicySection>>, loading: false }),
  actions: { async load() { this.loading = true; this.rows = await listPolicySection(); this.loading = false; } }
});
