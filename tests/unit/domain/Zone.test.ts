import { createZone } from "../../../src/domain/zone/Zone";

const LICEO_JRJ = createZone({
  zone_id: 1,
  name: "Liceo JRJ",
  latitude: 4.773210,
  longitude: -74.084051,
  radius_m: 300,
  alert_type: "GEOFENCE_EXIT",
  enabled: true,
});

describe("Zone.isWithin", () => {
  it("should return true when coordinate is at zone center", () => {
    expect(LICEO_JRJ.isWithin(4.773210, -74.084051)).toBe(true);
  });

  it("should return true when coordinate is within radius", () => {
    // ~150m north of center
    expect(LICEO_JRJ.isWithin(4.774560, -74.084051)).toBe(true);
  });

  it("should return false when coordinate is outside radius", () => {
    // ~2km away
    expect(LICEO_JRJ.isWithin(4.755000, -74.084051)).toBe(false);
  });

  it("should return false when coordinate is just outside radius boundary", () => {
    // ~350m away, just beyond 300m radius
    expect(LICEO_JRJ.isWithin(4.770060, -74.084051)).toBe(false);
  });

  it("should return true when coordinate is just inside radius boundary", () => {
    // ~250m away, just within 300m radius
    expect(LICEO_JRJ.isWithin(4.770870, -74.084051)).toBe(true);
  });

  it("should handle coordinates far away correctly", () => {
    // Bogotá city center, ~6km away
    expect(LICEO_JRJ.isWithin(4.711000, -74.072000)).toBe(false);
  });
});