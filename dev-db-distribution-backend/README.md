# dev-db-distribution-backend

Secure Fastify + TypeScript API that manages raw SQL backups and distributes them by issuing short-lived Azure Blob SAS URLs. Authenticated Microsoft Entra ID (Azure AD) users submit jobs, a Windows runner performs the backups, and the API keeps an audit trail.

## Features

- Microsoft Entra ID JWT verification (RS256 + JWKS) with RBAC mapped to Azure AD group object IDs.
- Prisma ORM targeting Azure SQL; schema covers server/database registry, jobs, and download audit.
- Azure Blob integration with user delegation SAS preferred, connection string fallback for local/dev.
- Runner PowerShell script orchestrates `BACKUP DATABASE`, AzCopy uploads, and status transitions.
- Structured logging via Pino, centralized error handler, live/ready health endpoints.
- Extensible scaffolding for future sanitization workflow (Phase 2 hooks).

## Prerequisites

- Node.js 20+
- pnpm/npm for dependency management
- Azure subscription with:
  - Entra ID tenant + App Registration for this API resource
  - Azure SQL Database / Managed Instance
  - Azure Storage account + container for backups
- Access to configure Azure AD security groups for Admins and Auditors
- Windows host for the Runner with `sqlcmd` and AzCopy installed

## Configuration

Copy `.env.example` to `.env` and populate the values:

- **Auth**
  - `AAD_TENANT_ID`: Directory (tenant) ID
  - `AAD_AUTHORITY`: Authority URL (defaults to `https://login.microsoftonline.com/{tenant}/v2.0`)
  - `AAD_API_CLIENT_ID`: Application (client) ID of this API registration
  - `AAD_ALLOWED_AUDIENCES`: Comma-separated list of accepted audiences (client IDs)
  - `AAD_ALLOWED_GROUPS_ADMINS`, `AAD_ALLOWED_GROUPS_AUDITORS`: CSV of group object IDs driving RBAC
- **Runner**
  - `RUNNER_BEARER_TOKEN`: Pre-shared bearer token used by Runner
- **Database**
  - `DATABASE_URL`: SQL Server connection string understood by Prisma (encrypt=true recommended)
- **Storage**
  - `AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_CONTAINER`, `AZURE_STORAGE_BACKUPS_PREFIX`
  - `USE_MANAGED_IDENTITY=true` for MSI/Workload Identity; otherwise supply `AZURE_STORAGE_CONNECTION_STRING`
- **SAS Defaults**
  - `DEFAULT_SAS_TTL_HOURS`: TTL for user download links (can be overridden per request)
- **CORS**
  - `CORS_ORIGINS`: CSV of allowed origins (leave empty for dev-only scenarios)

Load environment variables automatically with `dotenv`.

## Setup & Development

```bash
# install dependencies
npm install

# generate Prisma client
yarn prisma:generate # or npm run prisma:generate

# push schema to Azure SQL (use carefully)
npm run prisma:push

# seed sample data (server, databases, sample job)
npm run seed

# start development server with hot reload
npm run dev
```

Health endpoints are exposed at:

- `GET /api/health/live`
- `GET /api/health/ready` (checks SQL + Blob container access)

## Azure AD Registration Checklist

1. Create an App Registration for the API (expose a custom scope if needed).
2. Note the Application (client) ID and Directory (tenant) ID.
3. Under **Expose an API**, ensure the application ID URI matches one of the audiences supplied via `AAD_ALLOWED_AUDIENCES`.
4. Create Azure AD security groups for Admins and Auditors; capture their object IDs.
5. Configure your client applications (e.g., portal) to request the exposed scope and include group claims in tokens (Security > Token configuration).

## Database Provisioning

- Deploy Azure SQL Database or Managed Instance.
- Ensure the service principal / SQL credentials used in `DATABASE_URL` have permissions to manage the schema.
- Run `npm run prisma:push` to create tables.
- Optional: share `scripts/sql/create-schema.sql` with DBAs for change control.

## Storage & Managed Identity

- Create / identify the storage account and blob container for raw backups.
- Grant the managed identity (if using MSI) the `Storage Blob Data Contributor` role on the account or container.
- For local/dev, set `USE_MANAGED_IDENTITY=false` and provide `AZURE_STORAGE_CONNECTION_STRING`.

## Runner Service

1. Copy `scripts/runner-config.sample.json` to a secure location (e.g., `scripts/runner-config.json`) and populate:
   - `apiBase`: Public API endpoint
   - `apiToken`: Same as `RUNNER_BEARER_TOKEN`
   - `serverDns`: Matches `ServerReg.dns`
   - `sqlInstance`: SQL Server instance name for `sqlcmd`
   - `localBackupDir`: Temporary backup location
   - `azCopyPath`: Path to AzCopy executable
   - `containerPrefix`: Should match `AZURE_STORAGE_BACKUPS_PREFIX`
   - `cleanupAfterUpload`: `true` to delete local `.bak` files post-upload
2. Install `sqlcmd` (part of SQL Server tools) and AzCopy v10 on the runner host.
3. Run the script manually to validate:

   ```powershell
   pwsh runner/Runner.ps1 -ConfigPath ..\scripts\runner-config.json
   ```

4. Wrap the script as a Windows service (NSSM / WinSW) with auto-restart and secure credentials.

The runner loop:

1. Polls `GET /api/jobs/next?serverDns=...`.
2. Marks the job as RUNNING.
3. Executes `BACKUP DATABASE ... TO DISK` with COPY_ONLY + COMPRESSION.
4. Computes SHA-256 of the backup file.
5. Requests a write SAS URL via `PATCH /api/jobs/{id}` (RUNNING + blobPath).
6. Uploads with AzCopy (MD5 verification enabled).
7. Marks the job COMPLETED with checksum and timestamp.
8. Reports failures and backs off before retrying.

## Security Notes

- Rotate `RUNNER_BEARER_TOKEN` regularly; store securely (e.g., Key Vault).
- Restrict network access: API behind Application Gateway/App Service with private endpoints where possible.
- Enforce HTTPS only and tighten CORS to production origins.
- Monitor Pino logs for anomalies; forward to Azure Monitor / Log Analytics.
- SAS URLs are short-lived; adjust `DEFAULT_SAS_TTL_HOURS` to match policy.
- No sanitization is performed—Phase 2 hooks can extend `jobs` flow before issuing download SAS.

## Testing & Validation

- Basic smoke test: `npm run dev` then `curl http://localhost:8080/api/health/live`.
- Add integration tests (e.g., with Supertest) around job lifecycle if expanding the project.
- Prisma migrations recommended for production (instead of `db push`).

## Deployment

- Build with `npm run build` (bundles via `tsup`).
- Deploy output from `dist/` to your Node runtime (Azure App Service, Container Apps, etc.).
- Provide environment variables through your platform (App Settings / Key Vault references).
- Ensure managed identity or connection strings configured per environment.

## Future Extensions

- Phase-2 sanitization hook before generating download SAS URLs.
- UI portal integration for job submission and audit visibility.
- Additional audit exports or alerts (Event Grid, Teams notifications).

