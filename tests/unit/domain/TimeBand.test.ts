import { buildDateRangeForBand, BAND_WINDOWS } from "../../../src/domain/route/TimeBand";

describe("BAND_WINDOWS", () => {
  it("should define AM band with correct UTC hours", () => {
    expect(BAND_WINDOWS.AM.startHour).toBe(10);
    expect(BAND_WINDOWS.AM.endHour).toBe(15);
  });

  it("should define PM band with correct UTC hours", () => {
    expect(BAND_WINDOWS.PM.startHour).toBe(20);
    expect(BAND_WINDOWS.PM.endHour).toBe(22);
  });
});

describe("buildDateRangeForBand", () => {
  it("should return correct UTC range for AM band", () => {
    const date = new Date("2026-03-17");
    const range = buildDateRangeForBand(date, "AM");
    expect(range.start).toEqual(new Date("2026-03-17T10:00:00.000Z"));
    expect(range.stop).toEqual(new Date("2026-03-17T15:00:00.000Z"));
  });

  it("should return correct UTC range for PM band", () => {
    const date = new Date("2026-03-17");
    const range = buildDateRangeForBand(date, "PM");
    expect(range.start).toEqual(new Date("2026-03-17T20:00:00.000Z"));
    expect(range.stop).toEqual(new Date("2026-03-17T22:00:00.000Z"));
  });

  it("should work correctly for different dates", () => {
    const date = new Date("2026-01-01");
    const range = buildDateRangeForBand(date, "AM");
    expect(range.start).toEqual(new Date("2026-01-01T10:00:00.000Z"));
    expect(range.stop).toEqual(new Date("2026-01-01T15:00:00.000Z"));
  });

  it("should not mutate the input date", () => {
    const date = new Date("2026-03-17");
    const originalTime = date.getTime();
    buildDateRangeForBand(date, "AM");
    expect(date.getTime()).toBe(originalTime);
  });
});
