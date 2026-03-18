import { Zone } from "./Zone";

export interface RawGeopoint {
  latitude: number;
  longitude: number;
  position_ts: Date;
}

export interface DetectedGeopoint {
  zone_id: number;
  geotag: string;
  event_type: "ENTRY" | "EXIT";
  event_ts: Date;
  latitude: number;
  longitude: number;
}

export function detectZoneTransitions(
  points: RawGeopoint[],
  zones: Zone[]
): DetectedGeopoint[] {
  if (points.length === 0 || zones.length === 0) return [];

  const detected: DetectedGeopoint[] = [];

  // zone_id → whether vehicle is currently inside that zone
  const currentZones = new Set<number>();

  for (const point of points) {
    for (const zone of zones) {
      if (!zone.enabled) continue;

      const isInside = zone.isWithin(point.latitude, point.longitude);
      const wasInside = currentZones.has(zone.zone_id);

      if (isInside && !wasInside) {
        // Zone entry transition
        currentZones.add(zone.zone_id);

        if (zone.alert_type === "GEOFENCE_ENTRY") {
          detected.push({
            zone_id:    zone.zone_id,
            geotag:     zone.name,
            event_type: "ENTRY",
            event_ts:   point.position_ts,
            latitude:   point.latitude,
            longitude:  point.longitude,
          });
        }
      } else if (!isInside && wasInside) {
        // Zone exit transition
        currentZones.delete(zone.zone_id);

        if (zone.alert_type === "GEOFENCE_EXIT") {
          detected.push({
            zone_id:    zone.zone_id,
            geotag:     zone.name,
            event_type: "EXIT",
            event_ts:   point.position_ts,
            latitude:   point.latitude,
            longitude:  point.longitude,
          });
        }
      }
    }
  }

  return detected;
}