import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { getUserProfile, createUserProfile } from '../services/users';

// User interface bridging Supabase Auth User with legacy uid/id properties
export interface AuthUser extends SupabaseAuthUser {
  uid: string;
  photoURL?: string;
  displayName?: string;
}

export interface AuthContextType {
  currentUser: AuthUser | null;
  userData: User | null;
  user: AuthUser | null;
  userProfile: User | null;
  loading: boolean;
  loginWithGoogle: (targetRedirect?: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (
    email: string,
    pass: string,
    name: string,
    studentDetails?: {
      college?: string;
      course?: string;
      yearOfStudy?: string;
      branch?: string;
    }
  ) => Promise<{ needsEmailVerification: boolean; user?: any }>;
  verifySignupOtp: (
    email: string,
    token: string,
    name?: string,
    studentDetails?: {
      college?: string;
      course?: string;
      yearOfStudy?: string;
      branch?: string;
    }
  ) => Promise<{ user: any; session: any }>;
  resendSignupOtp: (email: string) => Promise<void>;
  verifyRecoveryOtp: (email: string, token: string) => Promise<{ user: any; session: any }>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  incrementPixels: (delta: number) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  user: null,
  userProfile: null,
  loading: true,
  loginWithGoogle: async (_targetRedirect?: string) => {},
  loginWithEmail: async () => {},
  signupWithEmail: async () => ({ needsEmailVerification: false }),
  verifySignupOtp: async () => ({ user: null, session: null }),
  resendSignupOtp: async () => {},
  verifyRecoveryOtp: async () => ({ user: null, session: null }),
  resetPasswordForEmail: async () => {},
  updatePassword: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
  incrementPixels: (_delta: number) => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to format Supabase user with backward-compatible uid
  const formatAuthUser = (sbUser: SupabaseAuthUser): AuthUser => {
    return {
      ...sbUser,
      uid: sbUser.id,
      displayName: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Pixel Builder',
      photoURL: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || ''
    };
  };

  const fetchProfile = async (uid: string, authUser?: SupabaseAuthUser) => {
    try {
      let profile = await getUserProfile(uid);
      if (!profile && authUser) {
        profile = await createUserProfile(uid, {
          email: authUser.email || '',
          displayName: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Pixel Builder',
          photoURL: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || ''
        });
      }
      if (profile) {
        setUserData(profile);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Check if current URL contains OAuth parameters
    const checkOAuthParams = () => {
      if (typeof window === 'undefined') return { hasCode: false };
      try {
        const url = new URL(window.location.href);
        const hasCode = url.searchParams.has('code');
        const hasTokenInHash = url.hash.includes('access_token=');
        const hasError = url.searchParams.has('error') || url.hash.includes('error=');

        if (hasError && !window.location.pathname.includes('reset-password')) {
          const errorDesc = url.searchParams.get('error_description') || url.searchParams.get('error') || 'Authentication failed or was cancelled.';
          console.warn('[AuthContext] OAuth error in URL:', errorDesc);
          url.searchParams.delete('error');
          url.searchParams.delete('error_code');
          url.searchParams.delete('error_description');
          window.history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
        }
        return { hasCode: hasCode || hasTokenInHash };
      } catch {
        return { hasCode: false };
      }
    };

    const { hasCode } = checkOAuthParams();

    // 1. Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        const authUser = formatAuthUser(session.user);
        setCurrentUser(authUser);
        await fetchProfile(session.user.id, session.user);
        if (isMounted) {
          setLoading(false);
        }
      } else {
        // If an OAuth exchange is actively taking place in URL, don't clear until exchange completes or times out
        const stillHasCode = typeof window !== 'undefined' && (
          new URL(window.location.href).searchParams.has('code') || 
          window.location.hash.includes('access_token=')
        );
        if (!stillHasCode) {
          setCurrentUser(null);
          setUserData(null);
          if (isMounted) {
            setLoading(false);
          }
        }
      }
    });

    // 2. Also check active session in storage
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!isMounted) return;

        if (session?.user) {
          const authUser = formatAuthUser(session.user);
          setCurrentUser(authUser);
          await fetchProfile(session.user.id, session.user);
          if (isMounted) {
            setLoading(false);
          }
        } else if (!hasCode) {
          setCurrentUser(null);
          setUserData(null);
          if (isMounted) {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error initializing auth session:', err);
        if (isMounted && !hasCode) {
          setLoading(false);
        }
      }
    };

    initSession();

    // Safety fallback: if OAuth code was in URL but exchange somehow stalled, ensure loading unblocks
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (hasCode) {
      fallbackTimer = setTimeout(() => {
        if (isMounted) {
          console.warn('[AuthContext] OAuth callback resolution safety timeout reached');
          setLoading(false);
        }
      }, 6000);
    }

    return () => {
      isMounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async (targetRedirect?: string) => {
    if (targetRedirect) {
      sessionStorage.setItem('pm_auth_redirect', targetRedirect);
      localStorage.setItem('pm_auth_redirect', targetRedirect);
    }
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    if (error) throw error;
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    });
    if (error) throw error;
    if (data.user) {
      const authUser = formatAuthUser(data.user);
      setCurrentUser(authUser);
      await fetchProfile(data.user.id, data.user);
    }
  };

  const signupWithEmail = async (
    email: string,
    pass: string,
    name: string,
    studentDetails?: {
      college?: string;
      course?: string;
      yearOfStudy?: string;
      branch?: string;
    }
  ) => {
    const origin = typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://pixelmindss.vercel.app';
    const emailRedirectTo = `${origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        emailRedirectTo,
        data: {
          full_name: name,
          name: name,
          college: studentDetails?.college || '',
          course: studentDetails?.course || '',
          year_of_study: studentDetails?.yearOfStudy || '',
          branch: studentDetails?.branch || ''
        }
      }
    });
    if (error) throw error;
    if (data.session && data.user) {
      const authUser = formatAuthUser(data.user);
      setCurrentUser(authUser);
      await createUserProfile(data.user.id, {
        email,
        displayName: name,
        photoURL: '',
        college: studentDetails?.college,
        course: studentDetails?.course,
        yearOfStudy: studentDetails?.yearOfStudy,
        branch: studentDetails?.branch
      });
      return { needsEmailVerification: false, user: data.user };
    } else if (data.user && !data.session) {
      // If email confirmation is enabled, insert profile directly or allow on trigger
      try {
        await createUserProfile(data.user.id, {
          email,
          displayName: name,
          photoURL: '',
          college: studentDetails?.college,
          course: studentDetails?.course,
          yearOfStudy: studentDetails?.yearOfStudy,
          branch: studentDetails?.branch
        });
      } catch {
        // Ignore potential duplicate or permission edge case
      }
      throw new Error('Sign up successful! Please check your email to confirm your account before logging in, or disable email confirmations in your Supabase Auth dashboard.');
    }
    return data as { user: any; session: any };
  };

  const resetPasswordForEmail = async (email: string) => {
    const origin = typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://pixelmindss.vercel.app';
    const redirectTo = `${origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserData(null);
  };

  const refreshProfile = async () => {
    if (currentUser?.id) {
      await fetchProfile(currentUser.id);
    }
  };

  const incrementPixels = (delta: number) => {
    setUserData((prev) => (prev ? { ...prev, pixels: Math.max(0, (prev.pixels || 0) + delta) } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userData,
        user: currentUser,
        userProfile: userData,
        loading,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        verifySignupOtp,
        resendSignupOtp,
        verifyRecoveryOtp,
        resetPasswordForEmail,
        updatePassword,
        logout,
        refreshProfile,
        incrementPixels
      }}
    >
      {!loading ? (
        children
      ) : (
        <div className="flex h-screen items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-sky-500"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
