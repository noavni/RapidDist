import fp from "fastify-plugin";
import jwksRsa from "jwks-rsa";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";
import type { AuthenticatedUser } from "./types.js";

const jwksClient = jwksRsa({
  jwksUri: `${env.aadAuthority}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 10,
  cacheMaxAge: 60 * 60 * 1000,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const bearerPrefix = "Bearer ";

const azureJwtPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("user", null);

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const unauthorized = (message: string) =>
        fastify.httpErrors.unauthorized(message, { wwwAuthenticate: "Bearer" });

      const header = request.headers.authorization;
      if (!header || !header.startsWith(bearerPrefix)) {
        throw unauthorized("Missing or invalid Authorization header");
      }

      const token = header.slice(bearerPrefix.length).trim();
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded !== "object") {
        throw unauthorized("Invalid JWT");
      }

      const { header: jwtHeader } = decoded as { header: JwtHeader };
      if (!jwtHeader.kid) {
        throw unauthorized("Token missing key identifier (kid)");
      }

      const signingKey = await jwksClient.getSigningKey(jwtHeader.kid);
      const publicKey = signingKey.getPublicKey();

      const payload = jwt.verify(token, publicKey, {
        algorithms: ["RS256"],
        audience: env.allowedAudiences,
        issuer: env.aadAuthority,
        clockTolerance: 60,
      }) as JwtPayload & {
        oid?: string;
        tid?: string;
        groups?: string[];
        preferred_username?: string;
        email?: string;
        upn?: string;
        name?: string;
      };

      if (!payload.oid) {
        throw unauthorized("Token missing object identifier (oid)");
      }

      const groups = Array.isArray(payload.groups) ? payload.groups : [];
      const username =
        payload.preferred_username ??
        payload.email ??
        payload.upn ??
        (typeof payload.sub === "string" ? payload.sub : payload.oid);

      const user: AuthenticatedUser = {
        oid: payload.oid,
        username,
        email: payload.email,
        name: payload.name,
        groups,
        tenantId: payload.tid,
      };

      request.user = user;
      if (request.contextState) {
        request.contextState.user = user;
      }
    },
  );
};

export default fp(azureJwtPlugin);
