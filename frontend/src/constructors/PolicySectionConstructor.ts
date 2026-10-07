import type { PolicySection } from "../types/PolicySection";

export const createDefaultPolicySection = (overrides: Partial<PolicySection> = {}): PolicySection => ({
  id: 1 as never,
  document_id: 1 as never,
  section_no: "section no 1" as never,
  heading: "heading 1" as never,
  content: "content 1" as never,
  category: "REMOVED" as never,
  risk_level: "LOW" as never,
  ...overrides
});

export const createPolicySectionForm = createDefaultPolicySection;
export const createPolicySectionResponse = createDefaultPolicySection;
