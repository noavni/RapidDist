import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import {
  createJobSchema,
  listJobsQuerySchema,
  runnerNextJobQuerySchema,
  runnerJobUpdateSchema,
  createJobSasSchema,
} from "../schemas/jobs.js";
import { idParamSchema } from "../schemas/common.js";
import { resolveRole } from "../auth/rbac.js";
import { buildBlobPath, getUserDelegationSasUrl, getWriteSasUrl } from "../storage/blob.js";
import { env } from "../env.js";
import { assertSha256 } from "../utils/checksum.js";
import { toJobDto, toJobDtoList } from "../utils/dto.js";

const RUNNER_UPLOAD_SAS_TTL_MINUTES = 60;

const jobsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/api/jobs",
    { preHandler: fastify.authenticate },
    async (request) => {
      const body = createJobSchema.parse(request.body);
      const user = request.user!;

      const server = await prisma.server.findUnique({
        where: { id: body.serverId },
        include: { databases: true },
      });
      if (!server || !server.isActive) {
        throw fastify.httpErrors.badRequest("Server is not available");
      }

      const registeredDb = server.databases.find(
        (db) => db.dbName.toLowerCase() === body.database.toLowerCase(),
      );
      if (registeredDb && !registeredDb.isActive) {
        throw fastify.httpErrors.badRequest("Database is not active");
      }

      const requestedBy = user.email ?? user.username;
      const job = await prisma.job.create({
        data: {
          ticket: body.ticket,
          server: server.dns,
          database: body.database,
          requestedBy,
          status: "PENDING",
        },
      });

      return { data: { id: job.id, status: job.status } };
    },
  );

  fastify.get(
    "/api/jobs",
    { preHandler: fastify.authenticate },
    async (request) => {
      const query = listJobsQuerySchema.parse(request.query);
      const user = request.user!;
      const role = resolveRole(user);

      const where: Record<string, unknown> = {};
      if (query.status) {
        where.status = query.status;
      }
      if (query.ticket) {
        where.ticket = query.ticket;
      }
      if (role === "dev") {
        where.requestedBy = user.email ?? user.username;
      }

      const jobs = await prisma.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      return { data: toJobDtoList(jobs) };
    },
  );

  fastify.get(
    "/api/jobs/:id",
    { preHandler: fastify.authenticate },
    async (request) => {
      const params = idParamSchema.parse(request.params);
      const user = request.user!;
      const job = await prisma.job.findUnique({ where: { id: params.id } });
      if (!job) {
        throw fastify.httpErrors.notFound("Job not found");
      }

      const role = resolveRole(user);
      if (role === "dev" && job.requestedBy !== (user.email ?? user.username)) {
        throw fastify.httpErrors.forbidden("Job access denied");
      }

      return { data: toJobDto(job) };
    },
  );

  fastify.get(
    "/api/jobs/next",
    { preHandler: fastify.authenticateRunner },
    async (request, reply) => {
      const query = runnerNextJobQuerySchema.parse(request.query);
      const job = await prisma.job.findFirst({
        where: { status: "PENDING", server: query.serverDns },
        orderBy: { createdAt: "asc" },
      });
      if (!job) {
        reply.status(204);
        return;
      }

      return {
        data: {
          id: job.id,
          database: job.database,
          ticket: job.ticket,
          server: job.server,
        },
      };
    },
  );

  fastify.patch(
    "/api/jobs/:id",
    { preHandler: fastify.authenticateRunner },
    async (request) => {
      const params = idParamSchema.parse(request.params);
      const body = runnerJobUpdateSchema.parse(request.body);

      const job = await prisma.job.findUnique({ where: { id: params.id } });
      if (!job) {
        throw fastify.httpErrors.notFound("Job not found");
      }

      if (body.status === "RUNNING") {
        if (job.status !== "PENDING" && job.status !== "RUNNING") {
          throw fastify.httpErrors.conflict("Job is not pending or running");
        }
        const blobPath =
          body.blobPath ??
          job.blobPath ??
          buildBlobPath(job.server, job.database, job.ticket);

        const updated = await prisma.job.update({
          where: { id: params.id },
          data: {
            status: "RUNNING",
            blobPath,
          },
        });

        if (body.blobPath) {
          const destUrl = await getWriteSasUrl(blobPath, RUNNER_UPLOAD_SAS_TTL_MINUTES);
          return { data: toJobDto(updated), destUrl, blobPath };
        }

        return { data: toJobDto(updated), blobPath };
      }

      if (body.status === "COMPLETED") {
        if (job.status !== "RUNNING") {
          throw fastify.httpErrors.conflict("Job must be running to complete");
        }
        if (!job.blobPath && !body.blobPath) {
          throw fastify.httpErrors.badRequest("Blob path required for completion");
        }
        const blobPath = body.blobPath ?? job.blobPath!;
        let sha256: string;
        try {
          sha256 = assertSha256(body.sha256);
        } catch (error) {
          throw fastify.httpErrors.badRequest((error as Error).message);
        }
        const completedAt = body.completedAt ? new Date(body.completedAt) : new Date();

        const updated = await prisma.job.update({
          where: { id: params.id },
          data: {
            status: "COMPLETED",
            blobPath,
            sha256,
            etag: body.etag ?? job.etag,
            completedAt,
            error: null,
          },
        });

        return { data: toJobDto(updated) };
      }

      if (body.status === "FAILED") {
        if (job.status === "COMPLETED") {
          throw fastify.httpErrors.conflict("Completed jobs cannot fail");
        }
        const updated = await prisma.job.update({
          where: { id: params.id },
          data: {
            status: "FAILED",
            error: body.error,
          },
        });
        return { data: toJobDto(updated) };
      }

      throw fastify.httpErrors.badRequest("Unsupported status transition");
    },
  );

  fastify.post(
    "/api/jobs/:id/sas",
    { preHandler: fastify.authenticate },
    async (request) => {
      const params = idParamSchema.parse(request.params);
      const body = createJobSasSchema.parse(request.body ?? {});
      const user = request.user!;

      const job = await prisma.job.findUnique({ where: { id: params.id } });
      if (!job) {
        throw fastify.httpErrors.notFound("Job not found");
      }

      const role = resolveRole(user);
      if (role === "dev" && job.requestedBy !== (user.email ?? user.username)) {
        throw fastify.httpErrors.forbidden("Job access denied");
      }

      if (!job.blobPath) {
        throw fastify.httpErrors.badRequest("Job is missing blob path");
      }

      const ttl = body.ttlHours ?? env.defaultSasTtlHours;
      const sasUrl = await getUserDelegationSasUrl(job.blobPath, ttl);
      return { data: { sasUrl, ttlHours: ttl } };
    },
  );
};

export default fp(jobsRoutes);



