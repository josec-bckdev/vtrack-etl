/*
1. How do I check if a route already exists? ← idempotency check
2. How do I create a new route and get its UUID back?
3. How do I save a batch of geopoints for a route?
*/
import { TimeBand } from "./TimeBand";
import { DetectedGeopoint } from "../zone/ZoneTransitionDetector";

export interface Route {
  id:             string;
  ruta:           number;
  time_band_code: TimeBand;
  date_captured:  Date;
}

export interface CreateRouteInput {
  ruta:           number;
  time_band_code: TimeBand;
  date_captured:  Date;
}

export interface RouteRepository {
  findRoute(
    ruta:          number,
    timeBandCode:  TimeBand,
    dateCaptured:  Date
  ): Promise<Route | null>;

  createRoute(input: CreateRouteInput): Promise<Route>;

  saveGeopoints(
    routeId:   string,
    geopoints: DetectedGeopoint[]
  ): Promise<void>;
}


