import { BatchSummary } from "../../application/processBatch.usecase";

export type BatchJobStatus = "running" | "complete" | "failed";

export interface BatchJob {
  id:           string;
  triggered_at: Date;
  completed_at: Date | null;
  status:       BatchJobStatus;
  ruta:         number;
  start_date:   Date;
  end_date:     Date;
  summary:      BatchSummary | null;
}

export interface CreateBatchJobInput {
  ruta:       number;
  start_date: Date;
  end_date:   Date;
}

export interface BatchJobRepository {
  create(input: CreateBatchJobInput): Promise<BatchJob>;
  complete(id: string, summary: BatchSummary): Promise<BatchJob>;
  fail(id: string, error: string): Promise<BatchJob>;
  findById(id: string): Promise<BatchJob | null>;
  findAll(): Promise<BatchJob[]>;
}