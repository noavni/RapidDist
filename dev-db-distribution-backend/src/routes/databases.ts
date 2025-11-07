import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { idParamSchema } from "../schemas/common.js";
import { updateDatabaseSchema } from "../schemas/servers.js";
import { resolveRole } from "../auth/rbac.js";

const databasesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.patch(
    "/api/databases/:id",
    { preHandler: fastify.authenticate },
    async (request) => {
      const role = resolveRole(request.user!);
      if (role !== "admin") {
        throw fastify.httpErrors.forbidden("Admin role required");
      }

      const params = idParamSchema.parse(request.params);
      const body = updateDatabaseSchema.parse(request.body);

      const database = await prisma.databaseReg.update({
        where: { id: params.id },
        data: body,
      });

      return { data: database };
    },
  );
};

export default fp(databasesRoutes);
