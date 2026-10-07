import { defineStore } from "pinia";
import { listPolicyDocument } from "../api/PolicyDocument";
export const usePolicyDocumentStore = defineStore("policyDocument", {
  state: () => ({ rows: [] as Awaited<ReturnType<typeof listPolicyDocument>>, loading: false }),
  actions: { async load() { this.loading = true; this.rows = await listPolicyDocument(); this.loading = false; } }
});
