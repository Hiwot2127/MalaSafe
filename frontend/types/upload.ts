export interface UploadResponse {
  message: string;
  file_id: string;
  records_processed: number;
  errors?: UploadError[];
}

export interface UploadError {
  row: number;
  field: string;
  error: string;
}

export interface UploadedFile {
  id: string;
  file_name: string;
  upload_type: 'weekly_malaria' | 'monthly_malaria' | 'climate';
  uploaded_by: string;
  created_at: string;
  records_processed?: number;
}
