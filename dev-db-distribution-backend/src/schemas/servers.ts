import { z } from "zod";

export const createServerSchema = z.object({
  name: z.string().min(1),
  dns: z.string().min(1),
  isActive: z.boolean().optional(),
});

export const updateServerSchema = createServerSchema.partial().strict();

export const createDatabaseSchema = z.object({
  dbName: z.string().min(1),
  isActive: z.boolean().optional(),
});

export const updateDatabaseSchema = createDatabaseSchema.partial().strict();
