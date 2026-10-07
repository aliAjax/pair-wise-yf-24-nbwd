export const mockData = {
  "policyDocument": [
    {
      "id": 1,
      "title": "title 1",
      "version_label": "version label 1",
      "raw_text": "raw text 1",
      "normalized_sections": "normalized sections 1",
      "imported_at": "2026-06-11T09:00:00Z"
    },
    {
      "id": 2,
      "title": "title 2",
      "version_label": "version label 2",
      "raw_text": "raw text 2",
      "normalized_sections": "normalized sections 2",
      "imported_at": "2026-06-12T09:00:00Z"
    },
    {
      "id": 3,
      "title": "title 3",
      "version_label": "version label 3",
      "raw_text": "raw text 3",
      "normalized_sections": "normalized sections 3",
      "imported_at": "2026-06-13T09:00:00Z"
    }
  ],
  "policySection": [
    {
      "id": 1,
      "document_id": 1,
      "section_no": "section no 1",
      "heading": "heading 1",
      "content": "content 1",
      "category": "REMOVED",
      "risk_level": "LOW"
    },
    {
      "id": 2,
      "document_id": 2,
      "section_no": "section no 2",
      "heading": "heading 2",
      "content": "content 2",
      "category": "MODIFIED",
      "risk_level": "MEDIUM"
    },
    {
      "id": 3,
      "document_id": 3,
      "section_no": "section no 3",
      "heading": "heading 3",
      "content": "content 3",
      "category": "MOVED",
      "risk_level": "HIGH"
    }
  ],
  "diffResult": [
    {
      "id": 1,
      "old_document_id": 1,
      "new_document_id": 1,
      "section_id": 1,
      "diff_type": "REMOVED",
      "summary": "summary 1",
      "created_at": "2026-06-11T09:00:00Z"
    },
    {
      "id": 2,
      "old_document_id": 2,
      "new_document_id": 2,
      "section_id": 2,
      "diff_type": "MODIFIED",
      "summary": "summary 2",
      "created_at": "2026-06-12T09:00:00Z"
    },
    {
      "id": 3,
      "old_document_id": 3,
      "new_document_id": 3,
      "section_id": 3,
      "diff_type": "MOVED",
      "summary": "summary 3",
      "created_at": "2026-06-13T09:00:00Z"
    }
  ],
  "reviewNote": [
    {
      "id": 1,
      "diff_result_id": 1,
      "tag": "tag 1",
      "comment": "comment 1",
      "reviewer": "reviewer 1",
      "status": "CONFIRMED"
    },
    {
      "id": 2,
      "diff_result_id": 2,
      "tag": "tag 2",
      "comment": "comment 2",
      "reviewer": "reviewer 2",
      "status": "IGNORED"
    },
    {
      "id": 3,
      "diff_result_id": 3,
      "tag": "tag 3",
      "comment": "comment 3",
      "reviewer": "reviewer 3",
      "status": "OPEN"
    }
  ]
} as const;
