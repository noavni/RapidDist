import { PrismaClient } from "@prisma/client";
import { env } from "../env.js";
import { logger } from "../logger.js";

const prisma = new PrismaClient({
  log: env.nodeEnv === "development" ? ["query", "warn", "error"] : ["warn", "error"],
});

prisma.$on("error", (e) => {
  logger.error({ err: e }, "Prisma client error");
});

export { prisma };
