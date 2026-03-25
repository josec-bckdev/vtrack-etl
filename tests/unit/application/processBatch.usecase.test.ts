import { processBatch, BatchSummary } from "../../../src/application/processBatch.usecase";
import { ExtractionResult } from "../../../src/application/extractRoute.usecase";
import { TimeBand } from "../../../src/domain/route/TimeBand";

// Mock extractRoute so processBatch has no real dependencies
jest.mock("../../../src/application/extractRoute.usecase", () => ({
  extractRoute: jest.fn(),
}));

import { extractRoute } from "../../../src/application/extractRoute.usecase";
const mockExtractRoute = extractRoute as jest.MockedFunction<typeof extractRoute>;

const RUTA = 7;
const BANDS: TimeBand[] = ["AM", "PM"];

// Monday 2026-03-16
const MONDAY    = new Date("2026-03-16");
// Tuesday 2026-03-17
const TUESDAY   = new Date("2026-03-17");
// Friday 2026-03-20
const FRIDAY    = new Date("2026-03-20");
// Saturday 2026-03-21
const SATURDAY  = new Date("2026-03-21");
// Sunday 2026-03-22
const SUNDAY    = new Date("2026-03-22");

const SUCCESS: ExtractionResult  = { status: "success",  routeId: "uuid-1", geopointsCount: 3 };
const SKIPPED: ExtractionResult  = { status: "skipped",  reason: "already processed" };
const NO_DATA: ExtractionResult  = { status: "no_data",  reason: "no points returned" };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("processBatch — input validation", () => {
  it("should throw when startDate is after endDate", async () => {
    await expect(
      processBatch(TUESDAY, MONDAY, RUTA, BANDS, mockExtractRoute)
    ).rejects.toThrow("startDate must be before or equal to endDate");
  });

  it("should not call extractRoute when start > end", async () => {
    await expect(
      processBatch(TUESDAY, MONDAY, RUTA, BANDS, mockExtractRoute)
    ).rejects.toThrow();
    expect(mockExtractRoute).not.toHaveBeenCalled();
  });
});

describe("processBatch — date range generation", () => {
  it("should process correct number of jobs for a weekday range", async () => {
    mockExtractRoute.mockResolvedValue(SUCCESS);

    await processBatch(MONDAY, FRIDAY, RUTA, BANDS, mockExtractRoute);

    // Mon-Fri = 5 days × 2 bands = 10 jobs
    expect(mockExtractRoute).toHaveBeenCalledTimes(10);
  });

  it("should process exactly one day when start equals end on a weekday", async () => {
    mockExtractRoute.mockResolvedValue(SUCCESS);

    await processBatch(MONDAY, MONDAY, RUTA, BANDS, mockExtractRoute);

    // 1 day × 2 bands = 2 jobs
    expect(mockExtractRoute).toHaveBeenCalledTimes(2);
  });

  it("should silently skip Saturday and Sunday", async () => {
    mockExtractRoute.mockResolvedValue(SUCCESS);

    // Mon to Sun = 7 days, only 5 weekdays × 2 bands = 10 jobs
    await processBatch(MONDAY, SUNDAY, RUTA, BANDS, mockExtractRoute);

    expect(mockExtractRoute).toHaveBeenCalledTimes(10);
  });

  it("should return empty summary when range is entirely a weekend", async () => {
    const result = await processBatch(SATURDAY, SUNDAY, RUTA, BANDS, mockExtractRoute);

    expect(mockExtractRoute).not.toHaveBeenCalled();
    expect(result.total).toBe(0);
  });

  it("should process jobs in chronological order", async () => {
    mockExtractRoute.mockResolvedValue(SUCCESS);

    await processBatch(MONDAY, TUESDAY, RUTA, BANDS, mockExtractRoute);

    const calls = mockExtractRoute.mock.calls;
    const dates = calls.map(c => (c[2] as Date).toISOString().slice(0, 10));

    expect(dates).toEqual([
      "2026-03-16", "2026-03-16",
      "2026-03-17", "2026-03-17",
    ]);
  });
});

describe("processBatch — happy path", () => {
  it("should return correct summary when all jobs succeed", async () => {
    mockExtractRoute.mockResolvedValue(SUCCESS);

    const result = await processBatch(MONDAY, TUESDAY, RUTA, BANDS, mockExtractRoute);

    expect(result).toEqual<BatchSummary>({
      total:   4,
      success: 4,
      skipped: 0,
      no_data: 0,
      failed:  0,
      errors:  [],
    });
  });

  it("should return correct summary when all jobs are skipped", async () => {
    mockExtractRoute.mockResolvedValue(SKIPPED);

    const result = await processBatch(MONDAY, TUESDAY, RUTA, BANDS, mockExtractRoute);

    expect(result).toEqual<BatchSummary>({
      total:   4,
      success: 0,
      skipped: 4,
      no_data: 0,
      failed:  0,
      errors:  [],
    });
  });

  it("should return correct summary when all jobs return no_data", async () => {
    mockExtractRoute.mockResolvedValue(NO_DATA);

    const result = await processBatch(MONDAY, TUESDAY, RUTA, BANDS, mockExtractRoute);

    expect(result).toEqual<BatchSummary>({
      total:   4,
      success: 0,
      skipped: 0,
      no_data: 4,
      failed:  0,
      errors:  [],
    });
  });

  it("should return correct summary for mixed results", async () => {
    mockExtractRoute
      .mockResolvedValueOnce(SUCCESS)
      .mockResolvedValueOnce(SKIPPED)
      .mockResolvedValueOnce(NO_DATA)
      .mockResolvedValueOnce(SUCCESS);

    const result = await processBatch(MONDAY, TUESDAY, RUTA, BANDS, mockExtractRoute);

    expect(result.total).toBe(4);
    expect(result.success).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.no_data).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});

describe("processBatch — failure handling", () => {
  it("should continue processing after a single failure", async () => {
    mockExtractRoute
      .mockRejectedValueOnce(new Error("API timeout"))
      .mockResolvedValue(SUCCESS);

    const result = await processBatch(MONDAY, TUESDAY, RUTA, BANDS, mockExtractRoute);

    expect(mockExtractRoute).toHaveBeenCalledTimes(4);
    expect(result.failed).toBe(1);
    expect(result.success).toBe(3);
  });

  it("should record error details for failed jobs", async () => {
    mockExtractRoute
      .mockRejectedValueOnce(new Error("API timeout"))
      .mockResolvedValue(SUCCESS);

    const result = await processBatch(MONDAY, MONDAY, RUTA, BANDS, mockExtractRoute);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      date:  "2026-03-16",
      band:  "AM",
      error: "API timeout",
    });
  });

  it("should return all failed when every job throws", async () => {
    mockExtractRoute.mockRejectedValue(new Error("DB connection lost"));

    const result = await processBatch(MONDAY, TUESDAY, RUTA, BANDS, mockExtractRoute);

    expect(result.total).toBe(4);
    expect(result.failed).toBe(4);
    expect(result.success).toBe(0);
    expect(result.errors).toHaveLength(4);
  });

  it("should handle non-Error throws gracefully", async () => {
    mockExtractRoute.mockRejectedValueOnce("raw string error");
    mockExtractRoute.mockResolvedValue(SUCCESS);

    const result = await processBatch(MONDAY, MONDAY, RUTA, BANDS, mockExtractRoute);

    expect(result.errors[0]!.error).toBe("raw string error");
  });
});