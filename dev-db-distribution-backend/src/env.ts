import { config } from "dotenv";
import { z } from "zod";

config();

const commaSeparated = (value?: string) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0) ?? [];

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  AAD_TENANT_ID: z.string().min(1),
  AAD_AUTHORITY: z.string().url(),
  AAD_API_CLIENT_ID: z.string().min(1),
  AAD_ALLOWED_AUDIENCES: z.string().min(1),
  AAD_ALLOWED_GROUPS_ADMINS: z.string().optional(),
  AAD_ALLOWED_GROUPS_AUDITORS: z.string().optional(),
  RUNNER_BEARER_TOKEN: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  AZURE_STORAGE_ACCOUNT: z.string().min(1),
  AZURE_STORAGE_CONTAINER: z.string().min(1),
  AZURE_STORAGE_BACKUPS_PREFIX: z.string().default("raw-backups"),
  USE_MANAGED_IDENTITY: z
    .string()
    .optional()
    .transform((value) => (value ?? "false").toLowerCase() === "true"),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
  DEFAULT_SAS_TTL_HOURS: z.coerce.number().int().positive().default(24),
  CORS_ORIGINS: z.string().optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

const parsed = envSchema.parse(process.env);

if (
  !parsed.USE_MANAGED_IDENTITY &&
  (!parsed.AZURE_STORAGE_CONNECTION_STRING ||
    parsed.AZURE_STORAGE_CONNECTION_STRING.length === 0)
) {
  throw new Error(
    "AZURE_STORAGE_CONNECTION_STRING is required when USE_MANAGED_IDENTITY is false",
  );
}

export const env = {
  port: parsed.PORT,
  nodeEnv: parsed.NODE_ENV,
  aadTenantId: parsed.AAD_TENANT_ID,
  aadAuthority: parsed.AAD_AUTHORITY.replace(/\/$/, ""),
  aadClientId: parsed.AAD_API_CLIENT_ID,
  allowedAudiences: commaSeparated(parsed.AAD_ALLOWED_AUDIENCES),
  adminGroupIds: commaSeparated(parsed.AAD_ALLOWED_GROUPS_ADMINS ?? ""),
  auditorGroupIds: commaSeparated(parsed.AAD_ALLOWED_GROUPS_AUDITORS ?? ""),
  runnerBearerToken: parsed.RUNNER_BEARER_TOKEN,
  databaseUrl: parsed.DATABASE_URL,
  storageAccount: parsed.AZURE_STORAGE_ACCOUNT,
  storageContainer: parsed.AZURE_STORAGE_CONTAINER,
  storageBackupsPrefix: parsed.AZURE_STORAGE_BACKUPS_PREFIX,
  useManagedIdentity: parsed.USE_MANAGED_IDENTITY,
  storageConnectionString: parsed.AZURE_STORAGE_CONNECTION_STRING,
  defaultSasTtlHours: parsed.DEFAULT_SAS_TTL_HOURS,
  corsOrigins: commaSeparated(parsed.CORS_ORIGINS ?? ""),
};

export type AppEnv = typeof env;
