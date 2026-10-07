import { mockData } from "../mocks/seedData";
import type { PolicySection } from "../types/PolicySection";
import { readStore, writeStore } from "../utils/localStorage";

const endpoint = "/api/policy-section";
const STORE_KEY = "policy-section";

export async function listPolicySection(): Promise<PolicySection[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  return readStore<PolicySection[]>(STORE_KEY, () => [...(mockData.policySection as unknown as PolicySection[])]);
}

export async function savePolicySection(payload: PolicySection): Promise<PolicySection> {
  const rows = await listPolicySection();
  const index = rows.findIndex((row) => row.id === payload.id);
  if (index >= 0) rows[index] = payload;
  else rows.push(payload);
  writeStore(STORE_KEY, rows);
  console.info("save PolicySection", payload);
  return payload;
}
