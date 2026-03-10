/**
 * lib/auth.tsx — Global auth state
 *
 * onAuthStateChange fires for:
 *   SIGNED_IN        → user logged in / page loaded with existing session
 *   SIGNED_OUT       → user logged out
 *   TOKEN_REFRESHED  → access token silently refreshed (every ~55 min)
 *   USER_UPDATED     → profile changed
 *
 * autoRefreshToken: true in the Supabase client means TOKEN_REFRESHED
 * fires automatically — users stay logged in for 60 days without any action.
 */
"use client";
import {
  createContext, useContext, useEffect, useState, ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "./supabase";

interface AuthContextType {
  session: Session | null;
  user:    User    | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, loading: true, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Load existing session immediately on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for all auth events — including silent token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
