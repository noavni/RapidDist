# Sparkle DB Deployer Frontend

React + Vite portal for the `dev-db-distribution-backend` service. It surfaces job queues, job details, and admin registry views while authenticating users via Microsoft Entra ID and calling the Fastify API.

## Prerequisites

- Node.js 20+
- npm (or pnpm/yarn)
- An Entra ID App Registration configured for SPA redirect
- The backend API deployed and reachable (local or remote)

## Environment Variables

Copy `.env.example` to `.env` and populate:

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the Fastify backend (e.g. `https://api.example.com`) |
| `VITE_AAD_CLIENT_ID` | SPA client ID registered in Entra ID |
| `VITE_AAD_TENANT_ID` | Directory (tenant) ID |
| `VITE_AAD_API_SCOPE` | Scope to request for the protected API (`api://<backend-client-id>/.default` or a custom scope) |
| `VITE_AAD_REDIRECT_URI` | Redirect URL configured for the SPA (defaults to `http://localhost:5173`) |

The same scope must be exposed by the backend App Registration and granted to the SPA client.

## Local Development

```bash
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173`. When prompted, sign in with a user that satisfies the backend RBAC rules (group membership drives Admin/Auditor access).

## Available Screens

- **Dashboard** – fetches `/api/jobs`, shows status counts, and links to job details.
- **Create Job** – pulls active servers and databases, posts to `/api/jobs` after validating inputs.
- **Job Details** – loads `/api/jobs/:id` and can mint a short-lived SAS via `/api/jobs/:id/sas`.
- **Admin > Servers / Databases** – reads registry data from the backend (future work can enable create/update flows).

All API traffic flows through `useApiClient`, which acquires Entra ID tokens via MSAL (`@azure/msal-react`).

## Integration Notes

- Ensure CORS on the backend allows the SPA origin.
- Users must receive `groups` claims in tokens for RBAC; configure Microsoft Graph group claims as needed.
- The app opens SAS download links in a new tab; the browser must allow pop-ups for the domain.

## Production Build

```bash
npm run build
npm run preview # optional local verification
```

Deploy the contents of `dist/` to your preferred static host (Azure Static Web Apps, Azure Front Door + Storage, etc.). Remember to set the environment variables in your hosting platform.
