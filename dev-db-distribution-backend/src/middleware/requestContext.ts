import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import type { AuthenticatedUser } from "../auth/types.js";

export interface RequestContext {
  requestId: string;
  user?: AuthenticatedUser;
}

declare module "fastify" {
  interface FastifyRequest {
    contextState: RequestContext;
    user?: AuthenticatedUser;
  }
}

const requestContextPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("contextState", null);

  fastify.addHook("onRequest", async (request) => {
    request.contextState = {
      requestId: request.id,
      user: request.user,
    };
  });

  fastify.addHook("preHandler", async (request) => {
    request.contextState.user = request.user;
  });
};

export default fp(requestContextPlugin);
