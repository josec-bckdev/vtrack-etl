import request from "supertest";
import express from "express";
import { healthRouter } from "../../../src/api/routes/health.route";

const app = express();
app.use(healthRouter);

describe("GET /health", () => {
  it("should return 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("should return timestamp and uptime", async () => {
    const res = await request(app).get("/health");
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.uptime).toBeDefined();
  });
});