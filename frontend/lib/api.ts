import { createClient } from "./supabase";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(path: string, init: RequestInit = {}): Promise<any> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Request failed (${res.status})` }));
    // IMPORTANT: Never redirect to /login on a backend error.
    // The user's Supabase session is separate from backend API errors.
    // Shell.tsx handles redirecting when the Supabase session is null.
    throw new Error(err.detail ?? `Error ${res.status}`);
  }

  return res.json();
}
