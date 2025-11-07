import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { getBlobServiceClient } from "../storage/blob.js";
import { env } from "../env.js";

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/health/live", async () => ({ ok: true }));

  fastify.get("/api/health/ready", async () => {
    try {
      await prisma.$queryRaw(Prisma.sql`SELECT 1`);
      const serviceClient = getBlobServiceClient();
      const containerClient = serviceClient.getContainerClient(env.storageContainer);
      await containerClient.getProperties();
      return { ok: true };
    } catch (error) {
      fastify.log.error({ err: error }, "Readiness probe failed");
      throw fastify.httpErrors.serviceUnavailable("Dependencies not ready");
    }
  });
};

export default fp(healthRoutes);
