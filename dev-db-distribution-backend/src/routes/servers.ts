import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import {
  createServerSchema,
  updateServerSchema,
  createDatabaseSchema,
  adminServerQuerySchema,
} from "../schemas/servers.js";
import { idParamSchema } from "../schemas/common.js";
import { resolveRole } from "../auth/rbac.js";
import {
  toDatabaseDto,
  toDatabaseDtoList,
  toServerDto,
  toServerDtoList,
  toServerWithDatabasesDto,
} from "../utils/dto.js";

const serversRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/api/servers",
    { preHandler: fastify.authenticate },
    async (request) => {
      const servers = await prisma.server.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      return { data: toServerDtoList(servers) };
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
      const server = await prisma.server.create({
        data: body,
      });
      return { data: toServerDto(server) };
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
      const server = await prisma.server.update({
        where: { id: params.id },
        data: body,
      });
      return { data: toServerDto(server) };
    },
  );

  fastify.get(
    "/api/servers/:id/databases",
    { preHandler: fastify.authenticate },
    async (request) => {
      const params = idParamSchema.parse(request.params);
      const server = await prisma.server.findUnique({ where: { id: params.id } });
      if (!server) {
        throw fastify.httpErrors.notFound("Server not found");
      }
      const databases = await prisma.database.findMany({
        where: { serverId: params.id, isActive: true },
        orderBy: { dbName: "asc" },
      });
      return { data: toDatabaseDtoList(databases) };
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

      const server = await prisma.server.findUnique({ where: { id: params.id } });
      if (!server) {
        throw fastify.httpErrors.notFound("Server not found");
      }
      if (!server.isActive) {
        throw fastify.httpErrors.badRequest("Server is inactive");
      }

      const database = await prisma.database.create({
        data: {
          serverId: params.id,
          dbName: body.dbName,
          isActive: body.isActive ?? true,
        },
      });
      return { data: toDatabaseDto(database) };
    },
  );

  fastify.get(
    "/api/admin/servers",
    { preHandler: fastify.authenticate },
    async (request) => {
      const user = request.user!;
      const role = resolveRole(user);
      if (role !== "admin") {
        throw fastify.httpErrors.forbidden("Admin role required");
      }

      const query = adminServerQuerySchema.parse(request.query);
      const skip = (query.page - 1) * query.pageSize;

      const [servers, total] = await prisma.$transaction([
        prisma.server.findMany({
          orderBy: { name: "asc" },
          skip,
          take: query.pageSize,
          include: { databases: { orderBy: { dbName: "asc" } } },
        }),
        prisma.server.count(),
      ]);

      const items = servers.map(toServerWithDatabasesDto);
      const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);

      return {
        data: {
          items,
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages,
        },
      };
    },
  );
};

export default fp(serversRoutes);

