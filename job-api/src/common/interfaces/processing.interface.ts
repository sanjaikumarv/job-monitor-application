export interface ProcessingError {
  line: number;
  message: string;
  field?: string;
  raw?: Record<string, unknown>;
}

export interface ProcessingHistoryItem {
  id: string;
  folderId: string;
  folderName: string;
  fileName: string;
  filePath: string;
  fileHash: string;
  eventType: 'add' | 'change';
  status: 'success' | 'failed' | 'partial';
  recordsTotal: number;
  recordsValid: number;
  recordsFailed: number;
  durationMs: number;
  errors: ProcessingError[];
  processedAt: string;
}

