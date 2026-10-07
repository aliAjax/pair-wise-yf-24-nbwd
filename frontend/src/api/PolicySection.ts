import { mockData } from "../mocks/seedData";
import type { PolicySection } from "../types/PolicySection";

const endpoint = "/api/policy-section";

export async function listPolicySection(): Promise<PolicySection[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  return [...(mockData.policySection as unknown as PolicySection[])];
}

export async function savePolicySection(payload: PolicySection) {
  console.info("save PolicySection", payload);
  return payload;
}
