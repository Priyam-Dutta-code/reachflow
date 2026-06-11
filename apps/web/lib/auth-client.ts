/**
 * Auth client (Phase 3's browser half).
 *
 * The access JWT lives ONLY in this module's memory — never in storage. The
 * refresh token is an httpOnly cookie the JS can't read; /api/auth/refresh
 * rotates it through the proxy. apiFetch auto-refreshes once on a 401.
 */

const BASE = "/api/proxy";

let accessToken: string | null = null;

export type ApiUser = {
  id: string;
  email: string;
  name: string | null;
  email_verified: boolean;
  vertical: string;
  vertical_config: Record<string, unknown>;
  plan: string;
  plan_key: string;
  plan_name: string;
  credits: number;
  leads_quota: number;
  leads_used: number;
  emails_sent: number;
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  sender_linkedin: string | null;
  sender_role: string | null;
  sender_profile: string | null;
  onboarded: boolean;
  has_gmail_password: boolean;
  has_groq_api_key: boolean;
  missing_setup: string[];
  entitlements: Record<string, unknown>;
};

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : extractMessage(detail) ?? `Request failed (${status})`);
    this.status = status;
    this.detail = detail;
  }
}

function extractMessage(detail: unknown): string | null {
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  return null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }
  return null;
}

async function rawPost(path: string, payload?: unknown): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

type TokenResponse = { access_token: string; user: ApiUser };

async function handleTokenResponse(response: Response): Promise<ApiUser> {
  const body = (await parseBody(response)) as (TokenResponse & { detail?: unknown }) | null;
  if (!response.ok || !body?.access_token) {
    throw new ApiError(response.status, body?.detail ?? "Authentication failed.");
  }
  accessToken = body.access_token;
  return body.user;
}

export async function login(email: string, password: string): Promise<ApiUser> {
  return handleTokenResponse(await rawPost("/api/auth/login", { email, password }));
}

export async function register(payload: {
  name: string;
  email: string;
  password: string;
  vertical?: string;
}): Promise<ApiUser> {
  return handleTokenResponse(await rawPost("/api/auth/register", payload));
}

/** Restore/extend the session from the refresh cookie. Returns the user or null. */
export async function refresh(): Promise<ApiUser | null> {
  try {
    const response = await rawPost("/api/auth/refresh");
    if (!response.ok) {
      accessToken = null;
      return null;
    }
    return await handleTokenResponse(response);
  } catch {
    accessToken = null;
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await rawPost("/api/auth/logout");
  } finally {
    accessToken = null;
  }
}

/** Authenticated fetch through the proxy; refreshes once on 401 and retries. */
export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const attempt = async (): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return fetch(`${BASE}${path}`, { ...init, cache: "no-store", headers });
  };

  let response = await attempt();
  if (response.status === 401) {
    const refreshed = await refresh();
    if (refreshed) {
      response = await attempt();
    }
  }

  const body = await parseBody(response);
  if (!response.ok) {
    const detail = (body as { detail?: unknown } | null)?.detail ?? `Request failed (${response.status})`;
    throw new ApiError(response.status, detail);
  }
  return body as T;
}
