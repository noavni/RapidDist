import { z } from "zod";
import { JOB_STATUS } from "../constants/jobStatus.js";

export const createJobSchema = z.object({
  serverId: z.string().uuid(),
  database: z.string().min(1),
  ticket: z.string().min(1),
});

const jobStatusEnum = z.enum(JOB_STATUS);

export const listJobsQuerySchema = z
  .object({
    status: jobStatusEnum.optional(),
    ticket: z.string().optional(),
  })
  .strict();

export const runnerNextJobQuerySchema = z
  .object({
    serverDns: z.string().min(1),
  })
  .strict();

const runningUpdateSchema = z
  .object({
    status: z.literal("RUNNING"),
    blobPath: z.string().min(1).optional(),
  })
  .strict();

const completedUpdateSchema = z
  .object({
    status: z.literal("COMPLETED"),
    blobPath: z.string().min(1),
    sha256: z.string().min(64),
    etag: z.string().optional(),
    completedAt: z.string().datetime().optional(),
  })
  .strict();

const failedUpdateSchema = z
  .object({
    status: z.literal("FAILED"),
    error: z.string().min(1),
  })
  .strict();

export const runnerJobUpdateSchema = z.discriminatedUnion("status", [
  runningUpdateSchema,
  completedUpdateSchema,
  failedUpdateSchema,
]);

export const createJobSasSchema = z
  .object({
    ttlHours: z.coerce.number().int().positive().max(720).optional(),
  })
  .strict();

export const createDownloadLogSchema = z
  .object({
    jobId: z.string().uuid(),
    downloadedBy: z.string().min(1),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    success: z.boolean().optional(),
  })
  .strict();
