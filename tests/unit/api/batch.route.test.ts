import request from "supertest";
import express from "express";
import { Zone } from "../../../src/domain/zone/Zone";
import { createBatchRouter } from "../../../src/api/routes/batch.route";
import { BatchJobRepository, BatchJob } from "../../../src/domain/batch/BatchJobRepository";
import { RouteRepository } from "../../../src/domain/route/RouteRepository";
import { DatalakeClient } from "../../../src/infrastructure/http/DatalakeClient";
import { processBatch } from "../../../src/application/processBatch.usecase";

const mockProcessBatch = processBatch as jest.MockedFunction<typeof processBatch>;

const mockJob: BatchJob = {
  id:           "uuid-batch-1",
  triggered_at: new Date(),
  completed_at: null,
  status:       "running",
  ruta:         7,
  start_date:   new Date("2026-02-01"),
  end_date:     new Date("2026-03-01"),
  summary:      null,
};

const mockJobRepo: BatchJobRepository = {
  create:    jest.fn().mockResolvedValue(mockJob),
  complete:  jest.fn().mockResolvedValue({ ...mockJob, status: "complete" }),
  fail:      jest.fn().mockResolvedValue({ ...mockJob, status: "failed" }),
  findById:  jest.fn().mockResolvedValue(mockJob),
  findAll:   jest.fn().mockResolvedValue([mockJob]),
};

const mockRepo   = {} as RouteRepository;
const mockClient = {} as DatalakeClient;
const mockZones: Zone[]  = [];

jest.mock("../../../src/application/processBatch.usecase", () => ({
  processBatch: jest.fn().mockResolvedValue({
    total: 2, success: 2, skipped: 0, no_data: 0, failed: 0, errors: [],
  }),
}));

jest.mock("../../../src/application/extractRoute.usecase", () => ({
  extractRoute: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use(createBatchRouter({
  jobRepo:  mockJobRepo,
  repo:     mockRepo,
  client:   mockClient,
  zones:    mockZones,
}));

beforeEach(() => jest.clearAllMocks());

describe("POST /batch/trigger", () => {
  it("should return 202 with jobId immediately", async () => {
    const res = await request(app).post("/batch/trigger").send({});
    expect(res.status).toBe(202);
    expect(res.body.jobId).toBe("uuid-batch-1");
    expect(res.body.status).toBe("running");
  });

  it("should accept optional startDate and endDate", async () => {
    const res = await request(app)
      .post("/batch/trigger")
      .send({ startDate: "2026-02-01", endDate: "2026-02-28" });
    expect(res.status).toBe(202);
  });

  it("should return 400 for invalid date format", async () => {
    const res = await request(app)
      .post("/batch/trigger")
      .send({ startDate: "not-a-date" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid date format");
  });

  it("should create a batch job record", async () => {
    await request(app).post("/batch/trigger").send({});
    expect(mockJobRepo.create).toHaveBeenCalledTimes(1);
  });
});

describe("GET /batch/jobs", () => {
  it("should return list of jobs", async () => {
    const res = await request(app).get("/batch/jobs");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /batch/jobs/:jobId", () => {
  it("should return job by id", async () => {
    const res = await request(app).get("/batch/jobs/uuid-batch-1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("uuid-batch-1");
  });

  it("should return 404 when job not found", async () => {
    (mockJobRepo.findById as jest.Mock).mockResolvedValueOnce(null);
    const res = await request(app).get("/batch/jobs/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Job not found");
  });
});

describe("POST /batch/trigger — async callbacks", () => {
  it("should call jobRepo.complete when processBatch resolves", async () => {
    const summary = {
      total: 2, success: 2, skipped: 0, no_data: 0, failed: 0, errors: [],
    };
    mockProcessBatch.mockResolvedValueOnce(summary);

    await request(app).post("/batch/trigger").send({});

    // wait for the fire-and-forget to settle
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockJobRepo.complete).toHaveBeenCalledWith("uuid-batch-1", summary);
  });

  it("should call jobRepo.fail when processBatch rejects", async () => {
    mockProcessBatch.mockRejectedValueOnce(new Error("catastrophic failure"));

    await request(app).post("/batch/trigger").send({});

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockJobRepo.fail).toHaveBeenCalledWith("uuid-batch-1", "catastrophic failure");
  });

  it("should call jobRepo.fail with string error when non-Error thrown", async () => {
    mockProcessBatch.mockRejectedValueOnce("raw error");

    await request(app).post("/batch/trigger").send({});

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockJobRepo.fail).toHaveBeenCalledWith("uuid-batch-1", "raw error");
  });
});