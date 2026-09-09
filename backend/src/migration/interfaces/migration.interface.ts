export interface MigrationSummary {
  modelName: string;
  mongoCollection: string;
  postgresTable: string;
  discoveredCount: number;
  eligibleCount: number;
  skippedCount: number;
  transformedCount: number;
  childRecordsCount: number;
  errors: Array<{ docId?: string; reason: string; details?: any }>;
}

export interface DryRunReport {
  timestamp: string;
  executionMode: 'DRY_RUN' | 'EXECUTE';
  totalModelsProcessed: number;
  totalSourceDocuments: number;
  totalTargetRecords: number;
  totalChildRecords: number;
  totalErrors: number;
  summaries: MigrationSummary[];
}
