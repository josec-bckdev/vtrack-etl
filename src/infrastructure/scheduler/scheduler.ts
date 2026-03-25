import cron from "node-cron";
import { logger } from "../../lib/logger";
import { processBatch } from "../../application/processBatch.usecase";
import { extractRoute } from "../../application/extractRoute.usecase";
import { PrismaRouteRepository } from "../db/PrismaRouteRepository";
import { PrismaBatchJobRepository } from "../db/PrismaBatchJobRepository";
import { DatalakeClient } from "../http/DatalakeClient";
import { loadZones } from "../../domain/zone/ZoneLoader";
import {
  DEFAULT_RUTA,
  DEFAULT_BANDS,
  ZONES_YAML_PATH,
} from "../config/constants";
import { env } from "../config/env";

export function startScheduler(): void {
  // runs every day at 11pm COT (4am UTC next day)
  cron.schedule("0 4 * * *", async () => {
    logger.info("Scheduled daily job triggered");

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const zones   = loadZones(ZONES_YAML_PATH);
    const repo    = new PrismaRouteRepository();
    const jobRepo = new PrismaBatchJobRepository();
    const client  = new DatalakeClient(env.DATALAKE_API_URL);

    const job = await jobRepo.create({
      ruta:       DEFAULT_RUTA,
      start_date: yesterday,
      end_date:   yesterday,
    });

    try {
      const summary = await processBatch(
        yesterday,
        yesterday,
        DEFAULT_RUTA,
        [...DEFAULT_BANDS],
        /* istanbul ignore next */
        (ruta, band, date) => extractRoute(ruta, band, date, {
          repo,
          client,
          zones,
        }),
      );

      await jobRepo.complete(job.id, summary);
      logger.info("Scheduled daily job complete", { jobId: job.id, summary });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await jobRepo.fail(job.id, message);
      logger.error("Scheduled daily job failed", { jobId: job.id, error: message });
    }
  }, {
    timezone: "UTC",
  });

  logger.info("Scheduler started — daily job runs at 04:00 UTC");
}