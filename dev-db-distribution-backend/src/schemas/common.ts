import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const optionalBoolean = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    return value.toLowerCase() === "true";
  });

export const paginationQuery = z.object({
  take: z.coerce.number().int().positive().max(100).optional(),
  skip: z.coerce.number().int().nonnegative().optional(),
});
