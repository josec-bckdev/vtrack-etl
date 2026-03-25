import axios from "axios";
import { RawGeopoint } from "../../domain/zone/ZoneTransitionDetector";
import { logger } from "../../lib/logger";

// External API response shape — never leaks beyond this file
interface DatalakeApiResponse {
  id:                number;
  ruta:              number;
  ns_latitude:       number;
  ew_longitude:      number;
  position_ts:       string;
  route_status:      string;
  route_status_ts:   string | null;
  student_status:    string;
  student_status_ts: string | null;
  collected_at:      string;
}

function mapToRawGeopoint(item: DatalakeApiResponse): RawGeopoint {
  const ts = item.position_ts.endsWith("Z")
    ? item.position_ts
    : item.position_ts + "Z";

  return {
    latitude:    item.ns_latitude,
    longitude:   item.ew_longitude,
    position_ts: new Date(ts),
  };
}

export class DatalakeClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetchRouteData(start: Date, stop: Date): Promise<RawGeopoint[]> {
    try {
      const response = await axios.post<DatalakeApiResponse[]>(
        `${this.baseUrl}/route-data/by-date-range`,
        {
          start: start.toISOString(),
          stop:  stop.toISOString(),
        }
      );

      return response.data.map(mapToRawGeopoint);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Datalake API call failed", { message, start, stop });
        throw new Error(`Failed to fetch route data from datalake: ${message}`);
      }
  }
}