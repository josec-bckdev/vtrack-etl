import path from "path";
import { loadZones } from "../../../src/domain/zone/ZoneLoader";

const TEST_YAML_PATH = path.join(__dirname, "fixtures", "zones.test.yaml");

describe("loadZones", () => {
  it("should load and parse zones from yaml file", () => {
    const zones = loadZones(TEST_YAML_PATH);
    expect(zones).toHaveLength(2);
  });

  it("should correctly map yaml fields to Zone properties", () => {
    const zones = loadZones(TEST_YAML_PATH);
    const first = zones[0]!;

    expect(first.zone_id).toBe(1);
    expect(first.name).toBe("Test Zone Entry");
    expect(first.latitude).toBe(4.773210);
    expect(first.longitude).toBe(-74.084051);
    expect(first.radius_m).toBe(300);
    expect(first.alert_type).toBe("GEOFENCE_ENTRY");
    expect(first.enabled).toBe(true);
  });

  it("should return Zone objects with working isWithin method", () => {
    const zones = loadZones(TEST_YAML_PATH);
    const first = zones[0]!;

    // center point — must be inside
    expect(first.isWithin(4.773210, -74.084051)).toBe(true);
    // far away — must be outside
    expect(first.isWithin(4.500000, -74.084051)).toBe(false);
  });

  it("should load all zones as enabled by default", () => {
    const zones = loadZones(TEST_YAML_PATH);
    expect(zones.every(z => z.enabled)).toBe(true);
  });

  it("should throw a descriptive error when file does not exist", () => {
    expect(() => loadZones("/nonexistent/path/zones.yaml")).toThrow(
      "Failed to load zones from /nonexistent/path/zones.yaml"
    );
  });

  it("should correctly map second zone", () => {
    const zones = loadZones(TEST_YAML_PATH);
    const second = zones[1]!;

    expect(second.zone_id).toBe(2);
    expect(second.alert_type).toBe("GEOFENCE_EXIT");
  });
});