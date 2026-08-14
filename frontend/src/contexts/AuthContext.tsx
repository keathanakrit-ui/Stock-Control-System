import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { AuthContext, type AuthContextValue } from "./authContextValue";
import {
  signInWithPassword as signInWithPasswordRequest,
  signOut as signOutRequest,
} from "../services/authService";
import { getCurrentProfile } from "../services/profileService";
import type { Profile } from "../models/profile";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let requestNumber = 0;
    async function loadAuthorization(nextSession: Session | null) {
      const request = ++requestNumber;
      setIsLoading(true); setSession(nextSession); setProfile(null); setAccessError(null);
      if (!nextSession) { if (isMounted && request === requestNumber) setIsLoading(false); return; }
      try {
        const nextProfile = await getCurrentProfile(nextSession.user.id);
        if (!isMounted || request !== requestNumber) return;
        setProfile(nextProfile);
        if (!nextProfile) setAccessError("Your account does not have an application profile. Contact an administrator.");
        else if (!nextProfile.active) setAccessError("Your account is inactive. Contact an administrator.");
      } catch (error) {
        console.error("Cannot load authenticated profile", error);
        if (isMounted && request === requestNumber) setAccessError("Your application access could not be verified. Please try again.");
      } finally { if (isMounted && request === requestNumber) setIsLoading(false); }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return;
        queueMicrotask(() => void loadAuthorization(nextSession));
      },
    );

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) console.error("Cannot restore Supabase session", error);
      void loadAuthorization(data.session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    active: profile?.active === true,
    isLoading,
    accessError,
    async signIn(employeeCode, password) {
      await signInWithPasswordRequest(employeeCode, password);
    },
    async signOut() {
      await signOutRequest();
    },
  }), [accessError, isLoading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
