import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL:      z.string().min(1),
  DATALAKE_API_URL:  z.string().url(),
  NODE_ENV:          z.enum(["development", "production", "test"]).default("development"),
  PORT:              z.coerce.number().default(3000),
});

const parsed = envSchema.safeParse(process.env);

/* istanbul ignore next */
if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;