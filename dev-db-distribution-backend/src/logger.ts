import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.nodeEnv === "production" ? "info" : "debug",
  enabled: true,
  redact: {
    paths: ["req.headers.authorization", "res.headers.authorization"],
    remove: true,
  },
});
