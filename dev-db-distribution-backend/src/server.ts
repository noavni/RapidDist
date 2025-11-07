import fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { randomUUID } from "crypto";
import { logger } from "./logger.js";
import { env } from "./env.js";
import requestContext from "./middleware/requestContext.js";
import errorHandler from "./middleware/errorHandler.js";
import azureJwt from "./auth/azureJwt.js";
import runnerAuth from "./auth/runnerAuth.js";
import healthRoutes from "./routes/health.js";
import serversRoutes from "./routes/servers.js";
import databasesRoutes from "./routes/databases.js";
import jobsRoutes from "./routes/jobs.js";
import downloadsRoutes from "./routes/downloads.js";

export const buildServer = () => {
  const app = fastify({
    logger,
    disableRequestLogging: true,
    genReqId: () => randomUUID(),
  });

  app.register(sensible);
  app.register(helmet, { contentSecurityPolicy: false });
  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      if (env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Origin not allowed by CORS"), false);
      }
    },
    credentials: true,
  });

  app.register(requestContext);
  app.register(healthRoutes);

  app.register(async (secureApp) => {
    secureApp.register(azureJwt);
    secureApp.register(runnerAuth);

    secureApp.register(serversRoutes);
    secureApp.register(databasesRoutes);
    secureApp.register(jobsRoutes);
    secureApp.register(downloadsRoutes);
  });

  app.register(errorHandler);

  return app;
};
