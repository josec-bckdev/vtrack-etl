import { PrismaBatchJobRepository } from "../../src/infrastructure/db/PrismaBatchJobRepository";
import { prisma } from "../../src/infrastructure/db/prismaClient";

const repo = new PrismaBatchJobRepository();

const TEST_INPUT = {
  ruta:       999,
  start_date: new Date("2026-02-01"),
  end_date:   new Date("2026-02-28"),
};

const TEST_SUMMARY = {
  total:   10,
  success: 8,
  skipped: 1,
  no_data: 1,
  failed:  0,
  errors:  [],
};

async function cleanup(): Promise<void> {
  await prisma.batchJob.deleteMany({ where: { ruta: 999 } });
}

beforeEach(async () => { await cleanup(); });
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("PrismaBatchJobRepository.create", () => {
  it("should create a job with running status", async () => {
    const job = await repo.create(TEST_INPUT);

    expect(job.id).toBeDefined();
    expect(job.status).toBe("running");
    expect(job.ruta).toBe(999);
    expect(job.completed_at).toBeNull();
    expect(job.summary).toBeNull();
  });
});

describe("PrismaBatchJobRepository.complete", () => {
  it("should update status to complete with summary", async () => {
    const created   = await repo.create(TEST_INPUT);
    const completed = await repo.complete(created.id, TEST_SUMMARY);

    expect(completed.status).toBe("complete");
    expect(completed.completed_at).not.toBeNull();
    expect(completed.summary).toMatchObject(TEST_SUMMARY);
  });
});

describe("PrismaBatchJobRepository.fail", () => {
  it("should update status to failed with error", async () => {
    const created = await repo.create(TEST_INPUT);
    const failed  = await repo.fail(created.id, "DB connection lost");

    expect(failed.status).toBe("failed");
    expect(failed.completed_at).not.toBeNull();
  });
});

describe("PrismaBatchJobRepository.findById", () => {
  it("should return job by id", async () => {
    const created = await repo.create(TEST_INPUT);
    const found   = await repo.findById(created.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it("should return null when job not found", async () => {
    const found = await repo.findById("00000000-0000-0000-0000-000000000000");
    expect(found).toBeNull();
  });
});

describe("PrismaBatchJobRepository.findAll", () => {
  it("should return all jobs ordered by triggered_at desc", async () => {
    await repo.create(TEST_INPUT);
    await repo.create(TEST_INPUT);

    const jobs = await repo.findAll();
    const testJobs = jobs.filter(j => j.ruta === 999);

    expect(testJobs).toHaveLength(2);
    expect(testJobs[0]!.triggered_at >= testJobs[1]!.triggered_at).toBe(true);
  });
});