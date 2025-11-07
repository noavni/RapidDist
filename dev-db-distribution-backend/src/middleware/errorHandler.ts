import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

interface ProblemDetails {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

const errorHandler: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({ err: error, requestId: request.id }, "Unhandled error");

    if (error instanceof ZodError) {
      const payload: ProblemDetails = {
        statusCode: 400,
        error: "Bad Request",
        message: "Input validation failed",
        details: error.flatten(),
      };
      void reply.status(400).send(payload);
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const payload: ProblemDetails = {
        statusCode: 409,
        error: "Conflict",
        message: error.message,
      };
      void reply.status(409).send(payload);
      return;
    }

    const statusCode = (error.statusCode as number | undefined) ?? 500;
    const message = error.message || "Internal Server Error";
    const payload: ProblemDetails = {
      statusCode,
      error: statusCode >= 500 ? "Internal Server Error" : "Bad Request",
      message,
    };

    void reply.status(statusCode).send(payload);
  });
};

export default fp(errorHandler);
