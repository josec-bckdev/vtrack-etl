import { Router, Request, Response } from "express";
import { BatchJobRepository } from "../../domain/batch/BatchJobRepository";
import { RouteRepository } from "../../domain/route/RouteRepository";
import { DatalakeClient } from "../../infrastructure/http/DatalakeClient";
import { Zone } from "../../domain/zone/Zone";
import { processBatch } from "../../application/processBatch.usecase";
import { extractRoute } from "../../application/extractRoute.usecase";
import { logger } from "../../lib/logger";
import {
  BATCH_ORIGIN_DATE,
  DEFAULT_RUTA,
  DEFAULT_BANDS,
} from "../../infrastructure/config/constants";

interface BatchRouterDeps {
  jobRepo:  BatchJobRepository;
  repo:     RouteRepository;
  client:   DatalakeClient;
  zones:    Zone[];
}

export function createBatchRouter(deps: BatchRouterDeps): Router {
  const router = Router();

  router.post("/batch/trigger", async (req: Request, res: Response) => {
    const startDate = req.body.startDate
      ? new Date(req.body.startDate)
      : BATCH_ORIGIN_DATE;
    const endDate = req.body.endDate
      ? new Date(req.body.endDate)
      : new Date();

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({ error: "Invalid date format" });
      return;
    }

    const job = await deps.jobRepo.create({
      ruta:       DEFAULT_RUTA,
      start_date: startDate,
      end_date:   endDate,
    });

    logger.info("Batch job triggered", {
      jobId: job.id,
      startDate: startDate.toISOString().slice(0, 10),
      endDate:   endDate.toISOString().slice(0, 10),
    });

    res.status(202).json({ jobId: job.id, status: "running" });

    // fire and forget — runs after response is sent
    processBatch(
      startDate,
      endDate,
      DEFAULT_RUTA,
      [...DEFAULT_BANDS],
      /* istanbul ignore next */
      (ruta, band, date) => extractRoute(ruta, band, date, {
        repo:   deps.repo,
        client: deps.client,
        zones:  deps.zones,
      }),
    )
      .then(summary => deps.jobRepo.complete(job.id, summary))
      .catch(async (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        await deps.jobRepo.fail(job.id, message);
        logger.error("Batch job failed", { jobId: job.id, error: message });
      });
  });

  router.get("/batch/jobs", async (_req: Request, res: Response) => {
    const jobs = await deps.jobRepo.findAll();
    res.json(jobs);
  });

  router.get("/batch/jobs/:jobId", async (req: Request, res: Response) => {
    const job = await deps.jobRepo.findById(req.params["jobId"] as string);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(job);
  });

  return router;
}