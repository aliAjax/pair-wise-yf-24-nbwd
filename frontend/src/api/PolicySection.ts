import { mockData } from "../mocks/seedData";
import { TABLE_NAMES } from "../constants/storageKeys";
import { ensureTableSeeded, readTable, writeTable } from "../utils/localStore";
import type { StampedRow } from "../types/FieldChange";
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
  ensureTableSeeded(TABLE_NAMES.PolicySection, mockData.policySection as unknown as PolicySection[]);
  return readTable<StampedRow<PolicySection>>(TABLE_NAMES.PolicySection).map((row) => ({ ...row.data }));
}

export async function savePolicySection(payload: PolicySection) {
  console.info("save PolicySection", payload);
  ensureTableSeeded(TABLE_NAMES.PolicySection, mockData.policySection as unknown as PolicySection[]);
  const rows = readTable<StampedRow<PolicySection>>(TABLE_NAMES.PolicySection);
  const index = rows.findIndex((row) => row.data.id === payload.id);
  const stamp = new Date().toISOString();
  const next: StampedRow<PolicySection> = {
    data: payload,
    field_timestamps: Object.fromEntries(Object.keys(payload).map((field) => [field, stamp]))
  };
  if (index >= 0) rows[index] = next;
  else rows.push(next);
  writeTable(TABLE_NAMES.PolicySection, rows);
  return payload;
}
