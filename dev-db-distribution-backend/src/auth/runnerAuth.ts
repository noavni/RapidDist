import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

const prefix = "Bearer ";

declare module "fastify" {
  interface FastifyInstance {
    authenticateRunner: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const runnerAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    "authenticateRunner",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const header = request.headers.authorization;
      if (!header || !header.startsWith(prefix)) {
        throw fastify.httpErrors.unauthorized("Runner authorization required");
      }

      const token = header.slice(prefix.length).trim();
      if (token !== env.runnerBearerToken) {
        throw fastify.httpErrors.unauthorized("Invalid runner token");
      }
    },
  );
};

export default fp(runnerAuthPlugin);
