import path from "path";

// Business constants — not environment config
export const BATCH_ORIGIN_DATE = new Date("2026-02-01");
export const DEFAULT_RUTA      = 7;
export const DEFAULT_BANDS     = ["AM", "PM"] as const;
export const ZONES_YAML_PATH   = path.join(process.cwd(), "data", "zones.yaml");