-- CreateTable
CREATE TABLE "batch_job" (
    "id" UUID NOT NULL,
    "triggered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "status" VARCHAR(20) NOT NULL,
    "ruta" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "summary" JSONB,

    CONSTRAINT "batch_job_pkey" PRIMARY KEY ("id")
);
