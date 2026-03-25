import winston from "winston";

const isDevelopment = process.env["NODE_ENV"] !== "production";
/* istanbul ignore next */
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? "\n" + JSON.stringify(meta, null, 2)
      : "";
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);
/* istanbul ignore next */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);
/* istanbul ignore next */
export const logger = winston.createLogger({
  level:      isDevelopment ? "debug" : "info",
  format:     isDevelopment ? developmentFormat : productionFormat,
  transports: [
    new winston.transports.Console(),
  ],
});
/* istanbul ignore next */
if (process.env["NODE_ENV"] === "test") {
  logger.silent = true;
}