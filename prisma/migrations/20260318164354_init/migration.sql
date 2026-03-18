-- CreateTable
CREATE TABLE "time_band" (
    "code" VARCHAR(10) NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "start_hour" SMALLINT NOT NULL,
    "end_hour" SMALLINT NOT NULL,

    CONSTRAINT "time_band_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "zone" (
    "id" SERIAL NOT NULL,
    "zone_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "radius_m" INTEGER NOT NULL,
    "alert_type" VARCHAR(20) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route" (
    "id" UUID NOT NULL,
    "ruta" INTEGER NOT NULL,
    "time_band_code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "date_captured" DATE NOT NULL,

    CONSTRAINT "route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_geopoint" (
    "id" BIGSERIAL NOT NULL,
    "route_id" UUID NOT NULL,
    "zone_id" INTEGER,
    "geotag" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(20) NOT NULL,
    "event_ts" TIMESTAMPTZ NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,

    CONSTRAINT "route_geopoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zone_zone_id_key" ON "zone"("zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "route_ruta_time_band_code_date_captured_key" ON "route"("ruta", "time_band_code", "date_captured");

-- AddForeignKey
ALTER TABLE "route" ADD CONSTRAINT "route_time_band_code_fkey" FOREIGN KEY ("time_band_code") REFERENCES "time_band"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_geopoint" ADD CONSTRAINT "route_geopoint_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_geopoint" ADD CONSTRAINT "route_geopoint_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zone"("zone_id") ON DELETE SET NULL ON UPDATE CASCADE;
