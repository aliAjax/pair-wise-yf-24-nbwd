import { mockData } from "../mocks/seedData";
import type { PolicyDocument } from "../types/PolicyDocument";

const endpoint = "/api/policy-document";

export async function listPolicyDocument(): Promise<PolicyDocument[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  return [...(mockData.policyDocument as unknown as PolicyDocument[])];
}

export async function savePolicyDocument(payload: PolicyDocument) {
  console.info("save PolicyDocument", payload);
  return payload;
}
