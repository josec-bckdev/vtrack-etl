-- CreateIndex
CREATE INDEX "route_geopoint_route_id_idx" ON "route_geopoint"("route_id");

-- CreateIndex
CREATE INDEX "route_geopoint_event_ts_idx" ON "route_geopoint"("event_ts");
