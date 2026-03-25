import cron from "node-cron";

jest.mock("node-cron");
jest.mock("../../../src/application/processBatch.usecase");
jest.mock("../../../src/application/extractRoute.usecase");
jest.mock("../../../src/infrastructure/db/PrismaRouteRepository");
jest.mock("../../../src/infrastructure/db/PrismaBatchJobRepository");
jest.mock("../../../src/infrastructure/http/DatalakeClient");
jest.mock("../../../src/domain/zone/ZoneLoader");

import { startScheduler } from "../../../src/infrastructure/scheduler/scheduler";
import { processBatch } from "../../../src/application/processBatch.usecase";
import { PrismaBatchJobRepository } from "../../../src/infrastructure/db/PrismaBatchJobRepository";
import { loadZones } from "../../../src/domain/zone/ZoneLoader";

const mockCronSchedule = cron.schedule as jest.MockedFunction<typeof cron.schedule>;
const mockProcessBatch = processBatch as jest.MockedFunction<typeof processBatch>;
const mockLoadZones    = loadZones as jest.MockedFunction<typeof loadZones>;

const mockJob = {
  id:           "scheduler-job-uuid",
  triggered_at: new Date(),
  completed_at: null,
  status:       "running" as const,
  ruta:         7,
  start_date:   new Date(),
  end_date:     new Date(),
  summary:      null,
};

const mockJobRepoInstance = {
  create:   jest.fn().mockResolvedValue(mockJob),
  complete: jest.fn().mockResolvedValue({ ...mockJob, status: "complete" }),
  fail:     jest.fn().mockResolvedValue({ ...mockJob, status: "failed" }),
  findById: jest.fn(),
  findAll:  jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (PrismaBatchJobRepository as jest.Mock).mockImplementation(
    () => mockJobRepoInstance
  );
  mockLoadZones.mockReturnValue([]);
});

describe("startScheduler", () => {
  it("should register a cron job", () => {
    startScheduler();
    expect(mockCronSchedule).toHaveBeenCalledWith(
      "0 4 * * *",
      expect.any(Function),
      expect.objectContaining({ timezone: "UTC" })
    );
  });

  it("should complete job when processBatch succeeds", async () => {
    const summary = {
      total: 2, success: 2, skipped: 0, no_data: 0, failed: 0, errors: [],
    };
    mockProcessBatch.mockResolvedValueOnce(summary);

    startScheduler();

    // extract and invoke the cron callback directly
    const cronCallback = mockCronSchedule.mock.calls[0]![1] as () => Promise<void>;
    await cronCallback();

    expect(mockJobRepoInstance.complete).toHaveBeenCalledWith(
      mockJob.id,
      summary
    );
  });

  it("should fail job when processBatch throws", async () => {
    mockProcessBatch.mockRejectedValueOnce(new Error("API down"));

    startScheduler();

    const cronCallback = mockCronSchedule.mock.calls[0]![1] as () => Promise<void>;
    await cronCallback();

    expect(mockJobRepoInstance.fail).toHaveBeenCalledWith(
      mockJob.id,
      "API down"
    );
  });

  it("should process yesterday's date", async () => {
    mockProcessBatch.mockResolvedValueOnce({
      total: 0, success: 0, skipped: 0, no_data: 0, failed: 0, errors: [],
    });

    startScheduler();

    const cronCallback = mockCronSchedule.mock.calls[0]![1] as () => Promise<void>;
    await cronCallback();

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    expect(mockJobRepoInstance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        start_date: yesterday,
        end_date:   yesterday,
      })
    );
  });

  it("should handle non-Error throws gracefully", async () => {
  mockProcessBatch.mockRejectedValueOnce("raw string error");

  startScheduler();

  const cronCallback = mockCronSchedule.mock.calls[0]![1] as () => Promise<void>;
  await cronCallback();

  expect(mockJobRepoInstance.fail).toHaveBeenCalledWith(
    mockJob.id,
    "raw string error"
  );
});
});