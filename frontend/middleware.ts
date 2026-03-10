// middleware.ts
// Auth is handled client-side in Shell.tsx and lib/auth.tsx.
// No server-side middleware needed — avoids race conditions with
// Supabase's getUser() network call redirecting before cookies settle.
export function middleware() {}
export const config = { matcher: [] }; // match nothing
