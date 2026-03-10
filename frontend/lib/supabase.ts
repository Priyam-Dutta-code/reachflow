/**
 * lib/supabase.ts — Single shared Supabase client
 *
 * Uses @supabase/supabase-js directly (no SSR package).
 * Stores session in localStorage. onAuthStateChange auto-refreshes
 * the access token before it expires — sessions last 60 days.
 */
import { createClient as _createClient } from "@supabase/supabase-js";

// Singleton — reuse the same client across the app
let _client: ReturnType<typeof _createClient> | null = null;

export function createClient() {
  if (!_client) {
    _client = _createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession:     true,   // keep session across page reloads
          storageKey:         "rf_session",
          autoRefreshToken:   true,   // silently refresh before 1h expiry ← the fix
          detectSessionInUrl: true,   // handles magic link / OAuth callbacks
        },
      }
    );
  }
  return _client;
}
