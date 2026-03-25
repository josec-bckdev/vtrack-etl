import "dotenv/config";
import express from "express";
import { env } from "../infrastructure/config/env";
import { logger } from "../lib/logger";
import { healthRouter } from "./routes/health.route";
import { createBatchRouter } from "./routes/batch.route";
import { loadZones } from "../domain/zone/ZoneLoader";
import { PrismaRouteRepository } from "../infrastructure/db/PrismaRouteRepository";
import { PrismaBatchJobRepository } from "../infrastructure/db/PrismaBatchJobRepository";
import { DatalakeClient } from "../infrastructure/http/DatalakeClient";
import { ZONES_YAML_PATH } from "../infrastructure/config/constants";

export function createApp() {
  const app = express();
  app.use(express.json());

  // build dependencies once at startup
  const zones   = loadZones(ZONES_YAML_PATH);
  const repo    = new PrismaRouteRepository();
  const jobRepo = new PrismaBatchJobRepository();
  const client  = new DatalakeClient(env.DATALAKE_API_URL);

  logger.info("Loaded zones", { count: zones.length });

  // wire routes
  app.use(healthRouter);
  app.use(createBatchRouter({ jobRepo, repo, client, zones }));

  return app;
}

export async function startServer(): Promise<void> {
  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info("Server started", {
      port:    env.PORT,
      env:     env.NODE_ENV,
    });
  });
}

// only start if this file is run directly
if (require.main === module) {
  startServer().catch((error: unknown) => {
    logger.error("Failed to start server", { error });
    process.exit(1);
  });
}