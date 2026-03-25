import { extractRoute, ExtractionResult } from "../../../src/application/extractRoute.usecase";
import { RouteRepository, Route, CreateRouteInput } from "../../../src/domain/route/RouteRepository";
import { DatalakeClient } from "../../../src/infrastructure/http/DatalakeClient";
import { RawGeopoint, DetectedGeopoint } from "../../../src/domain/zone/ZoneTransitionDetector";
import { Zone, createZone } from "../../../src/domain/zone/Zone";
import { TimeBand } from "../../../src/domain/route/TimeBand";

const TEST_RUTA = 7;
const TEST_BAND: TimeBand = "AM";
const TEST_DATE = new Date("2026-03-17");

const mockRoute: Route = {
  id:             "uuid-123",
  ruta:           TEST_RUTA,
  time_band_code: TEST_BAND,
  date_captured:  TEST_DATE,
};

const mockZones: Zone[] = [
  createZone({
    zone_id:    1,
    name:       "Liceo JRJ",
    latitude:   4.773210,
    longitude:  -74.084051,
    radius_m:   300,
    alert_type: "GEOFENCE_EXIT",
    enabled:    true,
  }),
  createZone({
    zone_id:    3,
    name:       "Boyaca - Norte_1 160",
    latitude:   4.748207,
    longitude:  -74.069581,
    radius_m:   1200,
    alert_type: "GEOFENCE_ENTRY",
    enabled:    true,
  }),
];

const pointInsideLiceo: RawGeopoint = {
  latitude:    4.773210,
  longitude:   -74.084051,
  position_ts: new Date("2026-03-17T10:05:00.000Z"),
};

const pointOutsideAll: RawGeopoint = {
  latitude:    4.760000,
  longitude:   -74.075000,
  position_ts: new Date("2026-03-17T10:15:00.000Z"),
};

const pointInsideBoyaca: RawGeopoint = {
  latitude:    4.748207,
  longitude:   -74.069581,
  position_ts: new Date("2026-03-17T10:25:00.000Z"),
};

function makeMockRepo(overrides: Partial<RouteRepository> = {}): RouteRepository {
  return {
    findRoute:     jest.fn().mockResolvedValue(null),
    createRoute:   jest.fn().mockResolvedValue(mockRoute),
    saveGeopoints: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeMockClient(points: RawGeopoint[] = []): jest.Mocked<DatalakeClient> {
  return {
    fetchRouteData: jest.fn().mockResolvedValue(points),
  } as unknown as jest.Mocked<DatalakeClient>;
}

describe("extractRoute.usecase", () => {
  describe("idempotency", () => {
    it("should return skipped when route already exists", async () => {
      const repo   = makeMockRepo({ findRoute: jest.fn().mockResolvedValue(mockRoute) });
      const client = makeMockClient();

      const result = await extractRoute(TEST_RUTA, TEST_BAND, TEST_DATE, { repo, client, zones: mockZones });

      expect(result.status).toBe("skipped");
      expect(client.fetchRouteData).not.toHaveBeenCalled();
    });

    it("should include ruta and band in skip reason", async () => {
      const repo   = makeMockRepo({ findRoute: jest.fn().mockResolvedValue(mockRoute) });
      const client = makeMockClient();

      const result = await extractRoute(TEST_RUTA, TEST_BAND, TEST_DATE, { repo, client, zones: mockZones });

      expect(result.status).toBe("skipped");
      if (result.status === "skipped") {
        expect(result.reason).toContain("7");
        expect(result.reason).toContain("AM");
      }
    });
  });

  describe("datalake integration", () => {
    it("should call fetchRouteData with correct UTC range for AM band", async () => {
      const repo   = makeMockRepo();
      const client = makeMockClient([]);

      await extractRoute(TEST_RUTA, TEST_BAND, TEST_DATE, { repo, client, zones: mockZones });

      expect(client.fetchRouteData).toHaveBeenCalledWith(
        new Date("2026-03-17T10:00:00.000Z"),
        new Date("2026-03-17T15:00:00.000Z")
      );
    });

    it("should call fetchRouteData with correct UTC range for PM band", async () => {
      const repo   = makeMockRepo();
      const client = makeMockClient([]);

      await extractRoute(TEST_RUTA, "PM", TEST_DATE, { repo, client, zones: mockZones });

      expect(client.fetchRouteData).toHaveBeenCalledWith(
        new Date("2026-03-17T20:00:00.000Z"),
        new Date("2026-03-17T22:00:00.000Z")
      );
    });

    it("should return no_data when API returns empty array", async () => {
      const repo   = makeMockRepo();
      const client = makeMockClient([]);

      const result = await extractRoute(TEST_RUTA, TEST_BAND, TEST_DATE, { repo, client, zones: mockZones });

      expect(result.status).toBe("no_data");
      expect(repo.createRoute).not.toHaveBeenCalled();
    });
  });

  describe("happy path", () => {
    it("should create route and save geopoints on success", async () => {
      const repo   = makeMockRepo();
      const client = makeMockClient([pointInsideLiceo, pointOutsideAll]);

      const result = await extractRoute(TEST_RUTA, TEST_BAND, TEST_DATE, { repo, client, zones: mockZones });

      expect(repo.createRoute).toHaveBeenCalledWith({
        ruta:           TEST_RUTA,
        time_band_code: TEST_BAND,
        date_captured:  TEST_DATE,
      } satisfies CreateRouteInput);

      expect(repo.saveGeopoints).toHaveBeenCalledWith(
        mockRoute.id,
        expect.arrayContaining([
          expect.objectContaining({ zone_id: 1, event_type: "EXIT" }),
        ])
      );

      expect(result.status).toBe("success");
    });

    it("should return correct geopoints count on success", async () => {
      const repo   = makeMockRepo();
      const client = makeMockClient([pointInsideLiceo, pointOutsideAll, pointInsideBoyaca]);

      const result = await extractRoute(TEST_RUTA, TEST_BAND, TEST_DATE, { repo, client, zones: mockZones });

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.geopointsCount).toBe(2);
      }
    });

    it("should create route even when no zone transitions detected", async () => {
      const repo   = makeMockRepo();
      const client = makeMockClient([pointOutsideAll]);

      const result = await extractRoute(TEST_RUTA, TEST_BAND, TEST_DATE, { repo, client, zones: mockZones });

      expect(repo.createRoute).toHaveBeenCalled();
      expect(repo.saveGeopoints).toHaveBeenCalledWith(mockRoute.id, []);
      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.geopointsCount).toBe(0);
      }
    });
  });

  describe("error handling", () => {
    it("should propagate API errors without creating route", async () => {
      const repo   = makeMockRepo();
      const client = makeMockClient();
      client.fetchRouteData.mockRejectedValueOnce(new Error("Network timeout"));

      await expect(
        extractRoute(TEST_RUTA, TEST_BAND, TEST_DATE, { repo, client, zones: mockZones })
      ).rejects.toThrow("Network timeout");

      expect(repo.createRoute).not.toHaveBeenCalled();
    });

    it("should propagate DB errors from createRoute", async () => {
      const repo   = makeMockRepo({
        createRoute: jest.fn().mockRejectedValue(new Error("DB connection lost")),
      });
      const client = makeMockClient([pointOutsideAll]);

      await expect(
        extractRoute(TEST_RUTA, TEST_BAND, TEST_DATE, { repo, client, zones: mockZones })
      ).rejects.toThrow("DB connection lost");

      expect(repo.saveGeopoints).not.toHaveBeenCalled();
    });
  });
});