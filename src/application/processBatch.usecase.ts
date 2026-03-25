import { logger } from "../lib/logger";
import { TimeBand } from "../domain/route/TimeBand";
import { Zone } from "../domain/zone/Zone";
import { RouteRepository } from "../domain/route/RouteRepository";
import { DatalakeClient } from "../infrastructure/http/DatalakeClient";
import { extractRoute, ExtractionResult } from "./extractRoute.usecase";

export interface BatchSummary {
  total:   number;
  success: number;
  skipped: number;
  no_data: number;
  failed:  number;
  errors:  Array<{
    date:  string;
    band:  TimeBand;
    error: string;
  }>;
}

type ExtractRouteFn = (
  ruta:  number,
  band:  TimeBand,
  date:  Date,
  deps:  { repo: RouteRepository; client: DatalakeClient; zones: Zone[] }
) => Promise<ExtractionResult>;

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function generateWeekdayDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  while (current <= end) {
    if (!isWeekend(current)) {
      dates.push(new Date(current));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export async function processBatch(
  startDate:      Date,
  endDate:        Date,
  ruta:           number,
  bands:          TimeBand[],
  /* istanbul ignore next */
  extractRouteFn: ExtractRouteFn = extractRoute,
  deps?:          { repo: RouteRepository; client: DatalakeClient; zones: Zone[] }
): Promise<BatchSummary> {
  if (startDate > endDate) {
    throw new Error("startDate must be before or equal to endDate");
  }

  const weekdays = generateWeekdayDates(startDate, endDate);
  const summary: BatchSummary = {
    total:   0,
    success: 0,
    skipped: 0,
    no_data: 0,
    failed:  0,
    errors:  [],
  };

  logger.info("Starting batch processing", {
    startDate: startDate.toISOString().slice(0, 10),
    endDate:   endDate.toISOString().slice(0, 10),
    ruta,
    bands,
    weekdays:  weekdays.length,
  });

  for (const date of weekdays) {
    for (const band of bands) {
      const dateStr = date.toISOString().slice(0, 10);
      summary.total++;

      try {
        const result = await extractRouteFn(ruta, band, date, deps!);

        switch (result.status) {
          case "success":
            summary.success++;
            logger.info("Job succeeded", { ruta, band, date: dateStr, geopointsCount: result.geopointsCount });
            break;
          case "skipped":
            summary.skipped++;
            logger.debug("Job skipped", { ruta, band, date: dateStr });
            break;
          case "no_data":
            summary.no_data++;
            logger.debug("No data for job", { ruta, band, date: dateStr });
            break;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        summary.failed++;
        summary.errors.push({ date: dateStr, band, error: message });
        logger.error("Job failed", { ruta, band, date: dateStr, error: message });
      }
    }
  }

  logger.info("Batch processing complete", {
    ruta,
    ...summary,
    errors: summary.errors.length,
  });

  return summary;
}