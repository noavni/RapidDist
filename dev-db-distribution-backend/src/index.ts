import { buildServer } from "./server.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { prisma } from "./db/prisma.js";
import { getBlobServiceClient } from "./storage/blob.js";

const start = async () => {
  const app = buildServer();
  const port = env.port;

  try {
    await prisma.$connect();
    logger.info("Database connection established");
  } catch (error) {
    logger.error({ err: error }, "Failed to connect to database");
    process.exit(1);
  }

  try {
    const containerClient = getBlobServiceClient().getContainerClient(env.storageContainer);
    await containerClient.getProperties();
    logger.info({ container: env.storageContainer }, "Blob storage reachable");
  } catch (error) {
    logger.warn({ err: error }, "Failed to verify blob storage container");
  }

  try {
    await app.listen({ port, host: "0.0.0.0" });
    logger.info({ port }, "Server started");
  } catch (error) {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  }

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Received shutdown signal");
    try {
      await app.close();
      await prisma.$disconnect();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start().catch((error) => {
  logger.error({ err: error }, "Fatal error during startup");
  process.exit(1);
});
