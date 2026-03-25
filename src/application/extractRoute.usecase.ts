import { RouteRepository, CreateRouteInput } from "../domain/route/RouteRepository";
import { DatalakeClient } from "../infrastructure/http/DatalakeClient";
import { Zone } from "../domain/zone/Zone";
import { TimeBand, buildDateRangeForBand } from "../domain/route/TimeBand";
import { detectZoneTransitions } from "../domain/zone/ZoneTransitionDetector";
import { logger } from "../lib/logger";

export type ExtractionResult =
  | { status: "skipped"; reason: string }
  | { status: "no_data"; reason: string }
  | { status: "success"; routeId: string; geopointsCount: number };

interface ExtractRouteDeps {
  repo:   RouteRepository;
  client: DatalakeClient;
  zones:  Zone[];
}

export async function extractRoute(
  ruta:         number,
  band:         TimeBand,
  date:         Date,
  deps:         ExtractRouteDeps
): Promise<ExtractionResult> {
  const { repo, client, zones } = deps;
  const dateStr = date.toISOString().slice(0, 10);

  logger.debug("Starting route extraction", { ruta, band, date: dateStr });

  const existing = await repo.findRoute(ruta, band, date);
  if (existing) {
    logger.info("Route already processed, skipping", { ruta, band, date: dateStr });
    return {
      status: "skipped",
      reason: `Route ${ruta}-${band} on ${dateStr} already processed`,
    };
  }

  const { start, stop } = buildDateRangeForBand(date, band);
  logger.debug("Fetching route data from datalake", {
    ruta, band, start: start.toISOString(), stop: stop.toISOString()
  });

  const points = await client.fetchRouteData(start, stop);
  logger.debug("Received GPS points", { ruta, band, date: dateStr, count: points.length });

  if (points.length === 0) {
    logger.warn("No GPS points returned", { ruta, band, date: dateStr });
    return {
      status: "no_data",
      reason: `No GPS points returned for ruta ${ruta} band ${band} on ${dateStr}`,
    };
  }

  const geopoints = detectZoneTransitions(points, zones);
  logger.debug("Zone transitions detected", {
    ruta, band, date: dateStr, transitions: geopoints.length
  });

  const input: CreateRouteInput = {
    ruta,
    time_band_code: band,
    date_captured:  date,
  };

  const route = await repo.createRoute(input);
  await repo.saveGeopoints(route.id, geopoints);

  logger.info("Route extraction complete", {
    ruta, band, date: dateStr,
    routeId: route.id,
    geopointsCount: geopoints.length
  });

  return {
    status:         "success",
    routeId:        route.id,
    geopointsCount: geopoints.length,
  };
}