import { prisma } from "./prismaClient";
import {
  BatchJob,
  BatchJobRepository,
  BatchJobStatus,
  CreateBatchJobInput,
} from "../../domain/batch/BatchJobRepository";
import { BatchSummary } from "../../application/processBatch.usecase";
import { logger } from "../../lib/logger";

function mapToBatchJob(record: {
  id:           string;
  triggered_at: Date;
  completed_at: Date | null;
  status:       string;
  ruta:         number;
  start_date:   Date;
  end_date:     Date;
  summary:      unknown;
}): BatchJob {
  return {
    id:           record.id,
    triggered_at: record.triggered_at,
    completed_at: record.completed_at,
    status:       record.status as BatchJobStatus,
    ruta:         record.ruta,
    start_date:   record.start_date,
    end_date:     record.end_date,
    summary:      record.summary as BatchSummary | null,
  };
}

export class PrismaBatchJobRepository implements BatchJobRepository {
  async create(input: CreateBatchJobInput): Promise<BatchJob> {
    const record = await prisma.batchJob.create({
      data: {
        status:     "running",
        ruta:       input.ruta,
        start_date: input.start_date,
        end_date:   input.end_date,
      },
    });
    logger.debug("BatchJob created", { id: record.id });
    return mapToBatchJob(record);
  }

  async complete(id: string, summary: BatchSummary): Promise<BatchJob> {
    const record = await prisma.batchJob.update({
      where: { id },
      data:  {
        status:       "complete",
        completed_at: new Date(),
        summary:      summary as object,
      },
    });
    logger.info("BatchJob completed", { id, summary });
    return mapToBatchJob(record);
  }

  async fail(id: string, error: string): Promise<BatchJob> {
    const record = await prisma.batchJob.update({
      where: { id },
      data:  {
        status:       "failed",
        completed_at: new Date(),
        summary:      { error } as object,
      },
    });
    logger.error("BatchJob failed", { id, error });
    return mapToBatchJob(record);
  }

  async findById(id: string): Promise<BatchJob | null> {
    const record = await prisma.batchJob.findUnique({
      where: { id },
    });
    return record ? mapToBatchJob(record) : null;
  }

  async findAll(): Promise<BatchJob[]> {
    const records = await prisma.batchJob.findMany({
      orderBy: { triggered_at: "desc" },
    });
    return records.map(mapToBatchJob);
  }
}