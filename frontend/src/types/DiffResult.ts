export interface DiffResult {
  id: number;
  old_document_id: number;
  new_document_id: number;
  section_id: number;
  diff_type: string;
  summary: string;
  created_at: string;
}
