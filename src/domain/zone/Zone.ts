// Haversine-based geodesic distance calculation.
// Matches the Python geopy.distance.geodesic behavior closely enough
// for zone radius checks at the distances we operate with (~300-1500m).
const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function geodesicDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export interface Zone {
  zone_id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  alert_type: string;
  enabled: boolean;
  isWithin(lat: number, lon: number): boolean;
}

export interface ZoneData {
  zone_id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  alert_type: string;
  enabled: boolean;
}

export function createZone(data: ZoneData): Zone {
  return {
    ...data,
    isWithin(lat: number, lon: number): boolean {
      if (!this.enabled) return false;
      const distance = geodesicDistanceMeters(
        this.latitude,
        this.longitude,
        lat,
        lon
      );
      return distance <= this.radius_m;
    },
  };
}