import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { getSupabase } from '@/lib/supabase';
import { fetchProfile, registerProfile, updateProfile, type ProfileUpdate, type RegisterInput } from '@/services/people';
import type { Profile } from '@/types/models';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  /** True until the stored session and (if signed in) profile have been resolved. */
  initializing: boolean;
  profileError: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** needsConfirmation is true when the project requires email confirmation before sign-in. */
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  /** Emails a one-time recovery code (requires {{ .Token }} in the Supabase recovery template). */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Verifies the code and sets the new password, then signs the user in. */
  completePasswordReset: (email: string, code: string, newPassword: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  updateProfile: (patch: ProfileUpdate) => Promise<void>;
  reloadProfile: () => Promise<void>;
};

type ProfileState = { userId: string; profile: Profile | null; error: Error | null };

const AuthContext = createContext<AuthState | null>(null);

async function loadProfileState(id: string): Promise<ProfileState> {
  try {
    return { userId: id, profile: await fetchProfile(id), error: null };
  } catch (e) {
    return { userId: id, profile: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  // Keyed by user so a stale profile is never shown for a different (or no) session.
  const [profileState, setProfileState] = useState<ProfileState | null>(null);
  // While a password reset is completing, hold the new session back so the reset
  // screen is not unmounted between verifying the code and saving the password.
  const holdSession = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!holdSession.current) setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadProfileState(userId).then((next) => {
      if (!cancelled) setProfileState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const current = userId && profileState?.userId === userId ? profileState : null;
  const profile = current?.profile ?? null;
  const profileError = current?.error ?? null;

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // Drop every cached query so the next user never sees the previous user's data.
    queryClient.clear();
  }, [supabase, queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      initializing: !sessionLoaded || (!!userId && !current),
      profileError,
      signOut,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      },
      async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        return { needsConfirmation: !data.session };
      },
      async requestPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
      },
      async completePasswordReset(email, code, newPassword) {
        holdSession.current = true;
        try {
          const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
          if (error) throw error;
          const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
          if (updateError) {
            await supabase.auth.signOut();
            throw updateError;
          }
        } finally {
          holdSession.current = false;
          const { data } = await supabase.auth.getSession();
          setSession(data.session);
        }
      },
      async register(input) {
        if (!userId) throw new Error('You are not signed in.');
        const created = await registerProfile(input);
        setProfileState({ userId, profile: created, error: null });
      },
      async updateProfile(patch) {
        if (!userId) throw new Error('You are not signed in.');
        const updated = await updateProfile(userId, patch);
        setProfileState({ userId, profile: updated, error: null });
      },
      async reloadProfile() {
        if (userId) setProfileState(await loadProfileState(userId));
      },
    }),
    [session, profile, sessionLoaded, userId, current, profileError, supabase, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/**
 * Profile for screens that are only reachable once a profile exists.
 * Keeps the last known profile so screens unmounting during sign-out don't crash.
 */
export function useProfile(): Profile {
  const { profile } = useAuth();
  const [last, setLast] = useState(profile);
  if (profile && profile !== last) setLast(profile);
  const resolved = profile ?? last;
  if (!resolved) throw new Error('useProfile called without a profile');
  return resolved;
}
