import axios from "axios";
import { DatalakeClient } from "../../../src/infrastructure/http/DatalakeClient";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const client = new DatalakeClient("https://api.example.com");

const mockApiResponse = [
  {
    id: 1,
    ruta: 7,
    ns_latitude: 4.773210,
    ew_longitude: -74.084051,
    position_ts: "2026-03-17T10:05:00.000Z",
    route_status: "ACTIVE",
    route_status_ts: "2026-03-17T10:05:00.000Z",
    student_status: "ON_BOARD",
    student_status_ts: "2026-03-17T10:05:00.000Z",
    collected_at: "2026-03-17T10:05:00.000Z",
  },
  {
    id: 2,
    ruta: 7,
    ns_latitude: 4.760000,
    ew_longitude: -74.075000,
    position_ts: "2026-03-17T10:15:00.000Z",
    route_status: "ACTIVE",
    route_status_ts: "2026-03-17T10:15:00.000Z",
    student_status: "ON_BOARD",
    student_status_ts: "2026-03-17T10:15:00.000Z",
    collected_at: "2026-03-17T10:15:00.000Z",
  },
];

describe("DatalakeClient.fetchRouteData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return mapped RawGeopoints on success", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockApiResponse });

    const result = await client.fetchRouteData(
      new Date("2026-03-17T10:00:00.000Z"),
      new Date("2026-03-17T15:00:00.000Z")
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      latitude:    4.773210,
      longitude:   -74.084051,
      position_ts: new Date("2026-03-17T10:05:00.000Z"),
    });
  });

  it("should map ns_latitude and ew_longitude to domain names", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockApiResponse });

    const result = await client.fetchRouteData(
      new Date("2026-03-17T10:00:00.000Z"),
      new Date("2026-03-17T15:00:00.000Z")
    );

    expect(result[0]).not.toHaveProperty("ns_latitude");
    expect(result[0]).not.toHaveProperty("ew_longitude");
    expect(result[0]).toHaveProperty("latitude");
    expect(result[0]).toHaveProperty("longitude");
  });

  it("should send correct request body with ISO timestamps", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockApiResponse });

    const start = new Date("2026-03-17T10:00:00.000Z");
    const stop  = new Date("2026-03-17T15:00:00.000Z");

    await client.fetchRouteData(start, stop);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://api.example.com/route-data/by-date-range",
      { start: start.toISOString(), stop: stop.toISOString() }
    );
  });

  it("should return empty array when API returns empty list", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: [] });

    const result = await client.fetchRouteData(
      new Date("2026-03-17T10:00:00.000Z"),
      new Date("2026-03-17T15:00:00.000Z")
    );

    expect(result).toEqual([]);
  });

  it("should throw descriptive error when API call fails", async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error("Network Error"));

    await expect(
      client.fetchRouteData(
        new Date("2026-03-17T10:00:00.000Z"),
        new Date("2026-03-17T15:00:00.000Z")
      )
    ).rejects.toThrow("Failed to fetch route data from datalake: Network Error");
  });

  it("should convert position_ts strings to Date objects", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockApiResponse });

    const result = await client.fetchRouteData(
      new Date("2026-03-17T10:00:00.000Z"),
      new Date("2026-03-17T15:00:00.000Z")
    );

    expect(result[0]!.position_ts).toBeInstanceOf(Date);
  });

  it("should parse position_ts as UTC when no timezone indicator present", () => {
  const responseWithoutZ = [{
    ...mockApiResponse[0],
    position_ts: "2026-03-17T10:05:00",  // no Z
  }];
  mockedAxios.post.mockResolvedValueOnce({ data: responseWithoutZ });

  return client.fetchRouteData(
    new Date("2026-03-17T10:00:00.000Z"),
    new Date("2026-03-17T15:00:00.000Z")
  ).then(result => {
    expect(result[0]!.position_ts.toISOString()).toBe("2026-03-17T10:05:00.000Z");
  });
});
it("should handle non-Error rejections gracefully", async () => {
  mockedAxios.post.mockRejectedValueOnce("raw string error");

  await expect(
    client.fetchRouteData(
      new Date("2026-03-17T10:00:00.000Z"),
      new Date("2026-03-17T15:00:00.000Z")
    )
  ).rejects.toThrow("Failed to fetch route data from datalake: raw string error");
});
});