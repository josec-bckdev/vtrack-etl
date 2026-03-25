import { prisma } from "./prismaClient";
import {
  Route,
  CreateRouteInput,
  RouteRepository,
} from "../../domain/route/RouteRepository";
import { TimeBand } from "../../domain/route/TimeBand";
import { DetectedGeopoint } from "../../domain/zone/ZoneTransitionDetector";
import { logger } from "../../lib/logger";
/* istanbul ignore next */  
function toTimeBand(code: string): TimeBand {
  if (code === "AM" || code === "PM") return code;
  throw new Error(`Invalid time band code from DB: ${code}`);
}

function toPrismaDate(date: Date): Date {
  // Prisma Date fields strip time — normalize to midnight UTC
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function mapToRoute(record: {
  id: string;
  ruta: number;
  time_band_code: string;
  date_captured: Date;
}): Route {
  return {
    id:             record.id,
    ruta:           record.ruta,
    time_band_code: toTimeBand(record.time_band_code),
    date_captured:  record.date_captured,
  };
}

export class PrismaRouteRepository implements RouteRepository {
  async findRoute(
    ruta:         number,
    timeBandCode: TimeBand,
    dateCaptured: Date
  ): Promise<Route | null> {
    const record = await prisma.route.findUnique({
      where: {
        ruta_time_band_code_date_captured: {
          ruta,
          time_band_code: timeBandCode,
          date_captured:  toPrismaDate(dateCaptured),
        },
      },
    });

    return record ? mapToRoute(record) : null;
  }

  async createRoute(input: CreateRouteInput): Promise<Route> {
    const record = await prisma.route.create({
      data: {
        ruta:           input.ruta,
        time_band_code: input.time_band_code,
        date_captured:  toPrismaDate(input.date_captured),
      },
    });

    return mapToRoute(record);
  }

  async saveGeopoints(
    routeId:   string,
    geopoints: DetectedGeopoint[]
  ): Promise<void> {
    if (geopoints.length === 0) return;

    await prisma.routeGeopoint.createMany({
      data: geopoints.map((g) => ({
        route_id:   routeId,
        zone_id:    g.zone_id,
        geotag:     g.geotag,
        event_type: g.event_type,
        event_ts:   g.event_ts,
        latitude:   g.latitude,
        longitude:  g.longitude,
      })),
    });
    logger.debug("Geopoints saved", { routeId, count: geopoints.length }); 
    }
}