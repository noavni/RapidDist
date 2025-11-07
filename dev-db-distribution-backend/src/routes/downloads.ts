import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { createDownloadLogSchema } from "../schemas/jobs.js";
import { resolveRole } from "../auth/rbac.js";
import { toDownloadDto } from "../utils/dto.js";

const downloadsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/api/downloads",
    { preHandler: fastify.authenticate },
    async (request) => {
      const body = createDownloadLogSchema.parse(request.body);
      const user = request.user!;

      const job = await prisma.job.findUnique({ where: { id: body.jobId } });
      if (!job) {
        throw fastify.httpErrors.notFound("Job not found");
      }

      const role = resolveRole(user);
      if (role === "dev" && job.requestedBy !== (user.email ?? user.username)) {
        throw fastify.httpErrors.forbidden("Job access denied");
      }

      const download = await prisma.download.create({
        data: {
          jobId: body.jobId,
          downloadedBy: body.downloadedBy,
          ipAddress: body.ipAddress,
          userAgent: body.userAgent,
          success: body.success ?? true,
        },
      });

      return { data: toDownloadDto(download) };
    },
  );
};

export default fp(downloadsRoutes);
