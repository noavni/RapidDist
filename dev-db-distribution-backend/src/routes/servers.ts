import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { createServerSchema, updateServerSchema, createDatabaseSchema } from "../schemas/servers.js";
import { idParamSchema } from "../schemas/common.js";
import { resolveRole } from "../auth/rbac.js";

const serversRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/api/servers",
    { preHandler: fastify.authenticate },
    async (request) => {
      const servers = await prisma.serverReg.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      return { data: servers };
    },
  );

  fastify.post(
    "/api/servers",
    { preHandler: fastify.authenticate },
    async (request) => {
      const role = resolveRole(request.user!);
      if (role !== "admin") {
        throw fastify.httpErrors.forbidden("Admin role required");
      }

      const body = createServerSchema.parse(request.body);
      const server = await prisma.serverReg.create({
        data: body,
      });
      return { data: server };
    },
  );

  fastify.patch(
    "/api/servers/:id",
    { preHandler: fastify.authenticate },
    async (request) => {
      const role = resolveRole(request.user!);
      if (role !== "admin") {
        throw fastify.httpErrors.forbidden("Admin role required");
      }

      const params = idParamSchema.parse(request.params);
      const body = updateServerSchema.parse(request.body);
      const server = await prisma.serverReg.update({
        where: { id: params.id },
        data: body,
      });
      return { data: server };
    },
  );

  fastify.get(
    "/api/servers/:id/databases",
    { preHandler: fastify.authenticate },
    async (request) => {
      const params = idParamSchema.parse(request.params);
      const server = await prisma.serverReg.findUnique({ where: { id: params.id } });
      if (!server) {
        throw fastify.httpErrors.notFound("Server not found");
      }
      const databases = await prisma.databaseReg.findMany({
        where: { serverId: params.id, isActive: true },
        orderBy: { dbName: "asc" },
      });
      return { data: databases };
    },
  );

  fastify.post(
    "/api/servers/:id/databases",
    { preHandler: fastify.authenticate },
    async (request) => {
      const role = resolveRole(request.user!);
      if (role !== "admin") {
        throw fastify.httpErrors.forbidden("Admin role required");
      }

      const params = idParamSchema.parse(request.params);
      const body = createDatabaseSchema.parse(request.body);

      const server = await prisma.serverReg.findUnique({ where: { id: params.id } });
      if (!server) {
        throw fastify.httpErrors.notFound("Server not found");
      }
      if (!server.isActive) {
        throw fastify.httpErrors.badRequest("Server is inactive");
      }

      const database = await prisma.databaseReg.create({
        data: {
          serverId: params.id,
          dbName: body.dbName,
          isActive: body.isActive ?? true,
        },
      });
      return { data: database };
    },
  );
};

export default fp(serversRoutes);

