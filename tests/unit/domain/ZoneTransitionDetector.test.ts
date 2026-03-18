import { createZone } from "../../../src/domain/zone/Zone";
import { detectZoneTransitions, RawGeopoint, DetectedGeopoint } from "../../../src/domain/zone/ZoneTransitionDetector";
const zones = [
  createZone({
    zone_id: 1,
    name: "Liceo JRJ",
    latitude: 4.773210,
    longitude: -74.084051,
    radius_m: 300,
    alert_type: "GEOFENCE_EXIT",
    enabled: true,
  }),
  createZone({
    zone_id: 3,
    name: "Boyaca - Norte_1 160",
    latitude: 4.748207,
    longitude: -74.069581,
    radius_m: 1200,
    alert_type: "GEOFENCE_ENTRY",
    enabled: true,
  }),
  createZone({
    zone_id: 8,
    name: "Batan",
    latitude: 4.705053,
    longitude: -74.054543,
    radius_m: 600,
    alert_type: "GEOFENCE_ENTRY",
    enabled: true,
  }),
  createZone({
    zone_id: 13,
    name: "Batan",
    latitude: 4.705053,
    longitude: -74.054543,
    radius_m: 600,
    alert_type: "GEOFENCE_EXIT",
    enabled: true,
  }),
];

// Inside Liceo JRJ (zone 1)
const insideLiceo: RawGeopoint = {
  latitude: 4.773210,
  longitude: -74.084051,
  position_ts: new Date("2026-03-17T10:05:00.000Z"),
};

// Outside all zones
const outsideAll: RawGeopoint = {
  latitude: 4.760000,
  longitude: -74.075000,
  position_ts: new Date("2026-03-17T10:15:00.000Z"),
};

// Inside Boyaca Norte (zone 3, ENTRY)
const insideBoyaca: RawGeopoint = {
  latitude: 4.748207,
  longitude: -74.069581,
  position_ts: new Date("2026-03-17T10:25:00.000Z"),
};

// Inside Batan (zones 8 and 13 — same coords, both ENTRY and EXIT)
const insideBatan: RawGeopoint = {
  latitude: 4.705053,
  longitude: -74.054543,
  position_ts: new Date("2026-03-17T10:35:00.000Z"),
};

// Back outside all zones
const outsideAll2: RawGeopoint = {
  latitude: 4.690000,
  longitude: -74.054543,
  position_ts: new Date("2026-03-17T10:45:00.000Z"),
};

describe("detectZoneTransitions", () => {
  it("should return empty array when no points provided", () => {
    const result = detectZoneTransitions([], zones);
    expect(result).toEqual([]);
  });

  it("should return empty array when no zones provided", () => {
    const result = detectZoneTransitions([insideLiceo], []);
    expect(result).toEqual([]);
  });

  it("should detect EXIT event when leaving a GEOFENCE_EXIT zone", () => {
    const points = [insideLiceo, outsideAll];
    const result = detectZoneTransitions(points, zones);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      zone_id: 1,
      geotag: "Liceo JRJ",
      event_type: "EXIT",
      latitude: outsideAll.latitude,
      longitude: outsideAll.longitude,
      event_ts: outsideAll.position_ts,
    });
  });

  it("should detect ENTRY event when entering a GEOFENCE_ENTRY zone", () => {
    const points = [outsideAll, insideBoyaca];
    const result = detectZoneTransitions(points, zones);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      zone_id: 3,
      geotag: "Boyaca - Norte_1 160",
      event_type: "ENTRY",
      latitude: insideBoyaca.latitude,
      longitude: insideBoyaca.longitude,
      event_ts: insideBoyaca.position_ts,
    });
  });

  it("should NOT record event when inside a GEOFENCE_EXIT zone without leaving", () => {
    const points = [insideLiceo, insideLiceo];
    const result = detectZoneTransitions(points, zones);
    expect(result).toHaveLength(0);
  });

  it("should NOT record event when outside a GEOFENCE_ENTRY zone without entering", () => {
    const points = [outsideAll, outsideAll2];
    const result = detectZoneTransitions(points, zones);
    expect(result).toHaveLength(0);
  });

  it("should handle Batan dual-zone — both ENTRY and EXIT recorded independently", () => {
    const points = [outsideAll, insideBatan, outsideAll2];
    const result = detectZoneTransitions(points, zones);

    expect(result).toHaveLength(2);

    const entryEvent = result.find((g: DetectedGeopoint) => g.zone_id === 8);
    const exitEvent = result.find((g: DetectedGeopoint) => g.zone_id === 13);

    expect(entryEvent).toMatchObject({ event_type: "ENTRY", geotag: "Batan" });
    expect(exitEvent).toMatchObject({ event_type: "EXIT", geotag: "Batan" });
  });

  it("should record events in chronological order", () => {
    const points = [insideLiceo, outsideAll, insideBoyaca];
    const result = detectZoneTransitions(points, zones);

    expect(result).toHaveLength(2);
    expect(result[0]!.event_ts <= result[1]!.event_ts).toBe(true);
  });

  it("should ignore disabled zones", () => {
    const disabledZones = [
      createZone({
        zone_id: 3,
        name: "Boyaca - Norte_1 160",
        latitude: 4.748207,
        longitude: -74.069581,
        radius_m: 1200,
        alert_type: "GEOFENCE_ENTRY",
        enabled: false,         // disabled
      }),
    ];

    const result = detectZoneTransitions([outsideAll, insideBoyaca], disabledZones);
    expect(result).toHaveLength(0);
  });
});