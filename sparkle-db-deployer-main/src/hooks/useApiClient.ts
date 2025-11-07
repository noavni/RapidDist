import { useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { apiBaseUrl } from "@/lib/config";
import { loginRequest } from "@/auth/msalConfig";

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const joinUrl = (base: string, path: string) => {
  if (path.startsWith("http")) {
    return path;
  }
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const useApiClient = () => {
  const { instance, accounts } = useMsal();

  const acquireToken = useCallback(async () => {
    if (accounts.length === 0) {
      throw new Error("No active account available");
    }
    const account = accounts[0];
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        const response = await instance.acquireTokenPopup({
          ...loginRequest,
          account,
        });
        return response.accessToken;
      }
      throw error;
    }
  }, [accounts, instance]);

  const request = useCallback(
    async <T>(path: string, options: RequestInit = {}) => {
      const token = await acquireToken();
      const headers = new Headers(options.headers);
      headers.set("Authorization", `Bearer ${token}`);
      if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(joinUrl(apiBaseUrl, path), {
        ...options,
        headers,
      });

      if (response.status === 204) {
        return null as T;
      }

      const contentType = response.headers.get("content-type");
      const data = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        throw new ApiError(
          typeof data === "string" ? data : "Request failed",
          response.status,
          data,
        );
      }

      return data as T;
    },
    [acquireToken],
  );

  const get = useCallback(<T>(path: string) => request<T>(path), [request]);
  const post = useCallback(
    <T, B = unknown>(path: string, body?: B) =>
      request<T>(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      }),
    [request],
  );
  const patch = useCallback(
    <T, B = unknown>(path: string, body?: B) =>
      request<T>(path, {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
      }),
    [request],
  );

  return { get, post, patch };
};
