import type { PolicyDocument } from "../types/PolicyDocument";

export const createDefaultPolicyDocument = (overrides: Partial<PolicyDocument> = {}): PolicyDocument => ({
  id: 1 as never,
  title: "title 1" as never,
  version_label: "version label 1" as never,
  raw_text: "raw text 1" as never,
  normalized_sections: "normalized sections 1" as never,
  imported_at: "2026-06-11T09:00:00Z" as never,
  ...overrides
});

export const createPolicyDocumentForm = createDefaultPolicyDocument;
export const createPolicyDocumentResponse = createDefaultPolicyDocument;
