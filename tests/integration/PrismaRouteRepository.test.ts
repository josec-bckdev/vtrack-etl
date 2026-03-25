import { PrismaRouteRepository } from "../../src/infrastructure/db/PrismaRouteRepository";
import { prisma } from "../../src/infrastructure/db/prismaClient";
import { DetectedGeopoint } from "../../src/domain/zone/ZoneTransitionDetector";

const repo = new PrismaRouteRepository();

const TEST_RUTA = 999;
const TEST_BAND = "AM" as const;
const TEST_DATE = new Date("2026-01-15");

async function cleanupTestRoutes(): Promise<void> {
  await prisma.route.deleteMany({
    where: { ruta: TEST_RUTA },
  });
}

beforeEach(async () => {
  await cleanupTestRoutes();
});

afterAll(async () => {
  await cleanupTestRoutes();
  await prisma.$disconnect();
});

describe("PrismaRouteRepository.findRoute", () => {
  it("should return null when route does not exist", async () => {
    const result = await repo.findRoute(TEST_RUTA, TEST_BAND, TEST_DATE);
    expect(result).toBeNull();
  });

  it("should return route when it exists", async () => {
    await repo.createRoute({
      ruta:           TEST_RUTA,
      time_band_code: TEST_BAND,
      date_captured:  TEST_DATE,
    });

    const result = await repo.findRoute(TEST_RUTA, TEST_BAND, TEST_DATE);
    expect(result).not.toBeNull();
    expect(result!.ruta).toBe(TEST_RUTA);
    expect(result!.time_band_code).toBe(TEST_BAND);
  });
});

describe("PrismaRouteRepository.createRoute", () => {
  it("should create a route and return it with a generated UUID", async () => {
    const route = await repo.createRoute({
      ruta:           TEST_RUTA,
      time_band_code: TEST_BAND,
      date_captured:  TEST_DATE,
    });

    expect(route.id).toBeDefined();
    expect(route.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(route.ruta).toBe(TEST_RUTA);
    expect(route.time_band_code).toBe(TEST_BAND);
  });

  it("should enforce idempotency — duplicate insert throws", async () => {
    await repo.createRoute({
      ruta:           TEST_RUTA,
      time_band_code: TEST_BAND,
      date_captured:  TEST_DATE,
    });

    await expect(
      repo.createRoute({
        ruta:           TEST_RUTA,
        time_band_code: TEST_BAND,
        date_captured:  TEST_DATE,
      })
    ).rejects.toThrow();
  });
});

describe("PrismaRouteRepository.saveGeopoints", () => {
  it("should save geopoints linked to a route", async () => {
    const route = await repo.createRoute({
      ruta:           TEST_RUTA,
      time_band_code: TEST_BAND,
      date_captured:  TEST_DATE,
    });

    const geopoints: DetectedGeopoint[] = [
      {
        zone_id:    1,
        geotag:     "Liceo JRJ",
        event_type: "EXIT",
        event_ts:   new Date("2026-01-15T10:05:00.000Z"),
        latitude:   4.773210,
        longitude:  -74.084051,
      },
      {
        zone_id:    3,
        geotag:     "Boyaca - Norte_1 160",
        event_type: "ENTRY",
        event_ts:   new Date("2026-01-15T10:25:00.000Z"),
        latitude:   4.748207,
        longitude:  -74.069581,
      },
    ];

    await repo.saveGeopoints(route.id, geopoints);

    const saved = await prisma.routeGeopoint.findMany({
      where: { route_id: route.id },
    });

    expect(saved).toHaveLength(2);
    expect(saved[0]!.geotag).toBe("Liceo JRJ");
    expect(saved[1]!.geotag).toBe("Boyaca - Norte_1 160");
  });

  it("should do nothing when geopoints array is empty", async () => {
    const route = await repo.createRoute({
      ruta:           TEST_RUTA,
      time_band_code: TEST_BAND,
      date_captured:  TEST_DATE,
    });

    await expect(
      repo.saveGeopoints(route.id, [])
    ).resolves.not.toThrow();
  });
});