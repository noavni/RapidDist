const ensureEnv = (value: string | undefined, key: string) => {
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const rawApiBaseUrl = ensureEnv(import.meta.env.VITE_API_BASE_URL, "VITE_API_BASE_URL");

export const apiBaseUrl = rawApiBaseUrl.replace(/\/?$/, "");

export const aadClientId = ensureEnv(import.meta.env.VITE_AAD_CLIENT_ID, "VITE_AAD_CLIENT_ID");
export const aadTenantId = ensureEnv(import.meta.env.VITE_AAD_TENANT_ID, "VITE_AAD_TENANT_ID");

const defaultScope = `api://${aadClientId}/.default`;
export const aadScope = (import.meta.env.VITE_AAD_API_SCOPE as string | undefined)?.trim() || defaultScope;

export const redirectUri = (import.meta.env.VITE_AAD_REDIRECT_URI as string | undefined) || window.location.origin;
