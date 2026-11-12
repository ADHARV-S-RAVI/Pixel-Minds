import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { getUserProfile, createUserProfile, updateUserProfile } from '../services/users';

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
    username?: string,
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
    username?: string,
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
  incrementPixels: (delta: number, actionName?: string, reasonText?: string, idempotencyKey?: string) => Promise<void> | void;
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
  incrementPixels: (_delta: number, _actionName?: string, _reasonText?: string, _idempotencyKey?: string) => {},
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

  // Helper to check if an email user has not yet verified their email OTP
  const isEmailUnconfirmed = (sbUser: SupabaseAuthUser): boolean => {
    const isEmailUser = !sbUser.app_metadata?.provider || sbUser.app_metadata?.provider === 'email';
    const isConfirmed = Boolean(sbUser.email_confirmed_at || (sbUser as any).confirmed_at);
    return isEmailUser && !isConfirmed;
  };

  // Helper to automatically attribute referral code if available
  const handleReferralAttribution = async (uid: string, authUser?: SupabaseAuthUser) => {
    if (typeof window === 'undefined') return;
    try {
      const onboardedKey = `pm_ref_onboarded_${uid}`;
      const hasOnboarded = localStorage.getItem(onboardedKey) === 'true' || (authUser as any)?.user_metadata?.referral_onboarded;
      const pendingRef = sessionStorage.getItem('pm_ref_code') || localStorage.getItem('pm_ref_code');

      if (!hasOnboarded && pendingRef && pendingRef.trim()) {
        const { recordReferralSignup } = await import('../services/referrals');
        const res = await recordReferralSignup(pendingRef.trim(), uid);
        if (res.success || res.message?.toLowerCase().includes('already') || res.message?.toLowerCase().includes('self-referral')) {
          localStorage.setItem(onboardedKey, 'true');
          sessionStorage.removeItem('pm_ref_code');
          localStorage.removeItem('pm_ref_code');
        }
      }
    } catch (refErr) {
      console.warn('[AuthContext] Automatic referral attribution note:', refErr);
    }
  };

  // Fetch user profile with retry polling to allow Postgres trigger (handle_new_user) to commit on new signups
  const fetchProfileWithRetry = async (
    uid: string,
    authUser?: SupabaseAuthUser,
    extraDetails?: {
      college?: string;
      course?: string;
      yearOfStudy?: string;
      branch?: string;
      name?: string;
      username?: string;
    },
    maxAttempts = 3
  ): Promise<User | null> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const profile = await getUserProfile(uid);
        if (profile) {
          // If profile exists but username is missing, and we have an extra username, update it
          if (!profile.username && (extraDetails?.username || authUser?.user_metadata?.username)) {
            const u = (extraDetails?.username || authUser?.user_metadata?.username || '').toLowerCase().trim();
            if (u) {
              await updateUserProfile(uid, { username: u }).catch(() => {});
              profile.username = u;
            }
          }
          await handleReferralAttribution(uid, authUser);
          return profile;
        }
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      } catch (e) {
        console.warn(`[fetchProfileWithRetry] Attempt ${attempt} failed:`, e);
      }
    }

    // Fallback: If DB trigger hasn't populated profile yet, attempt client-side creation
    if (authUser) {
      try {
        const profile = await createUserProfile(uid, {
          email: authUser.email || '',
          displayName: extraDetails?.name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Pixel Builder',
          username: (extraDetails?.username || authUser.user_metadata?.username || '').toLowerCase().trim() || undefined,
          photoURL: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '',
          college: extraDetails?.college || authUser.user_metadata?.college,
          course: extraDetails?.course || authUser.user_metadata?.course,
          yearOfStudy: extraDetails?.yearOfStudy || authUser.user_metadata?.year_of_study,
          branch: extraDetails?.branch || authUser.user_metadata?.branch
        });
        await handleReferralAttribution(uid, authUser);
        return profile;
      } catch (err) {
        console.error('[fetchProfileWithRetry] Fallback creation note:', err);
      }
    }
    return null;
  };

  const fetchProfile = async (uid: string, authUser?: SupabaseAuthUser) => {
    try {
      const profile = await fetchProfileWithRetry(uid, authUser);
      if (profile) {
        if (typeof window !== 'undefined') {
          const storedLocal = localStorage.getItem(`pm_local_pixels_${uid}`);
          if (storedLocal !== null) {
            const parsed = parseInt(storedLocal, 10);
            if (!isNaN(parsed) && parsed > (profile.pixels || 0)) {
              profile.pixels = parsed;
            }
          }
        }
        setUserData(profile);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Check if an OAuth exchange or callback is actively in progress
    const checkOAuthInProgress = () => {
      if (typeof window === 'undefined') return false;
      try {
        const url = new URL(window.location.href);
        const hasCode = url.searchParams.has('code');
        const hasTokenInHash = url.hash.includes('access_token=');
        const storedOAuth = sessionStorage.getItem('pm_oauth_in_progress') === 'true' ||
                            localStorage.getItem('pm_oauth_in_progress') === 'true';

        const hasError = url.searchParams.has('error') || url.hash.includes('error=');
        if (hasError && !window.location.pathname.includes('reset-password')) {
          const errorDesc = url.searchParams.get('error_description') || url.searchParams.get('error') || 'Authentication failed or was cancelled.';
          console.warn('[AuthContext] OAuth error in URL:', errorDesc);
          sessionStorage.removeItem('pm_oauth_in_progress');
          localStorage.removeItem('pm_oauth_in_progress');
          url.searchParams.delete('error');
          url.searchParams.delete('error_code');
          url.searchParams.delete('error_description');
          window.history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
          return false;
        }

        if (hasCode || hasTokenInHash) {
          sessionStorage.setItem('pm_oauth_in_progress', 'true');
          return true;
        }
        return storedOAuth;
      } catch {
        return false;
      }
    };

    const isOAuthInitially = checkOAuthInProgress();

    // 1. Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        // Enforce email verification for email provider accounts
        if (isEmailUnconfirmed(session.user)) {
          console.warn('[AuthContext] Unverified email user session detected. Signing out.');
          await supabase.auth.signOut();
          if (isMounted) {
            setCurrentUser(null);
            setUserData(null);
            sessionStorage.removeItem('pm_oauth_in_progress');
            localStorage.removeItem('pm_oauth_in_progress');
            setLoading(false);
          }
          return;
        }

        // Establish user profile first, then set currentUser to avoid page-level race conditions
        const profile = await fetchProfileWithRetry(session.user.id, session.user);
        if (!isMounted) return;

        if (profile) {
          setUserData(profile);
        }
        const authUser = formatAuthUser(session.user);
        setCurrentUser(authUser);

        sessionStorage.removeItem('pm_oauth_in_progress');
        localStorage.removeItem('pm_oauth_in_progress');
        setLoading(false);
      } else {
        if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem('pm_oauth_in_progress');
          localStorage.removeItem('pm_oauth_in_progress');
          setCurrentUser(null);
          setUserData(null);
          if (isMounted) {
            setLoading(false);
          }
        } else if (event === 'INITIAL_SESSION') {
          // If OAuth PKCE exchange is in flight, do NOT clear state or set loading false
          const oauthActive = checkOAuthInProgress();
          if (!oauthActive) {
            setCurrentUser(null);
            setUserData(null);
            if (isMounted) {
              setLoading(false);
            }
          }
        } else {
          const oauthActive = checkOAuthInProgress();
          if (!oauthActive) {
            setCurrentUser(null);
            setUserData(null);
            if (isMounted) {
              setLoading(false);
            }
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
          if (isEmailUnconfirmed(session.user)) {
            await supabase.auth.signOut();
            if (isMounted) {
              setCurrentUser(null);
              setUserData(null);
              sessionStorage.removeItem('pm_oauth_in_progress');
              localStorage.removeItem('pm_oauth_in_progress');
              setLoading(false);
            }
            return;
          }

          const profile = await fetchProfileWithRetry(session.user.id, session.user);
          if (!isMounted) return;

          if (profile) {
            setUserData(profile);
          }
          const authUser = formatAuthUser(session.user);
          setCurrentUser(authUser);

          sessionStorage.removeItem('pm_oauth_in_progress');
          localStorage.removeItem('pm_oauth_in_progress');
          setLoading(false);
        } else {
          const oauthActive = checkOAuthInProgress();
          if (!oauthActive) {
            setCurrentUser(null);
            setUserData(null);
            if (isMounted) {
              setLoading(false);
            }
          }
        }
      } catch (err) {
        console.error('Error initializing auth session:', err);
        if (isMounted && !checkOAuthInProgress()) {
          setLoading(false);
        }
      }
    };

    initSession();

    // Safety fallback: if OAuth exchange was initiated but somehow stalled, unblock loading
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (isOAuthInitially) {
      fallbackTimer = setTimeout(() => {
        if (isMounted) {
          console.warn('[AuthContext] OAuth resolution safety timeout reached');
          sessionStorage.removeItem('pm_oauth_in_progress');
          localStorage.removeItem('pm_oauth_in_progress');
          setLoading(false);
        }
      }, 7000);
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
    sessionStorage.setItem('pm_oauth_in_progress', 'true');
    localStorage.setItem('pm_oauth_in_progress', 'true');

    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    if (error) {
      sessionStorage.removeItem('pm_oauth_in_progress');
      localStorage.removeItem('pm_oauth_in_progress');
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass
    });
    if (error) throw error;
    if (data.user) {
      // Disallow unverified email accounts from logging in
      if (isEmailUnconfirmed(data.user)) {
        await supabase.auth.signOut();
        throw new Error('Please verify your email before signing in. Check your inbox for the 6-digit verification code.');
      }

      const profile = await fetchProfileWithRetry(data.user.id, data.user);
      if (profile) {
        setUserData(profile);
      }
      const authUser = formatAuthUser(data.user);
      setCurrentUser(authUser);
    }
  };

  const signupWithEmail = async (
    email: string,
    pass: string,
    name: string,
    username?: string,
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
    const cleanUsername = username ? username.toLowerCase().trim() : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: pass,
      options: {
        emailRedirectTo,
        data: {
          full_name: name,
          name: name,
          username: cleanUsername,
          college: studentDetails?.college || '',
          course: studentDetails?.course || '',
          year_of_study: studentDetails?.yearOfStudy || '',
          branch: studentDetails?.branch || ''
        }
      }
    });
    if (error) throw error;

    // Under no circumstances should newly registered email accounts be signed in before OTP verification
    if (data.session) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setUserData(null);

    return { needsEmailVerification: true, user: data.user };
  };

  const verifySignupOtp = async (
    email: string,
    token: string,
    name?: string,
    username?: string,
    studentDetails?: {
      college?: string;
      course?: string;
      yearOfStudy?: string;
      branch?: string;
    }
  ) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'signup'
    });
    if (error) throw error;

    if (data.user) {
      const cleanUsername = username ? username.toLowerCase().trim() : undefined;
      const profile = await fetchProfileWithRetry(data.user.id, data.user, {
        college: studentDetails?.college,
        course: studentDetails?.course,
        yearOfStudy: studentDetails?.yearOfStudy,
        branch: studentDetails?.branch,
        name: name || data.user.user_metadata?.full_name,
        username: cleanUsername || data.user.user_metadata?.username
      });
      if (profile) {
        setUserData(profile);
      }
      const authUser = formatAuthUser(data.user);
      setCurrentUser(authUser);
    }
    return data as { user: any; session: any };
  };

  const resendSignupOtp = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase()
    });
    if (error) throw error;
  };

  const verifyRecoveryOtp = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'recovery'
    });
    if (error) throw error;
    if (data.user) {
      const authUser = formatAuthUser(data.user);
      setCurrentUser(authUser);
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

  // Real-time listener for profile balance and data changes from Supabase
  useEffect(() => {
    if (!currentUser?.id) return;

    let isSubscribed = true;
    const channelName = `profile-updates-${currentUser.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${currentUser.id}`
        },
        (payload: any) => {
          if (!isSubscribed) return;
          const updatedRow = payload?.new;
          if (updatedRow && updatedRow.id === currentUser.id) {
            setUserData((prev) => {
              if (!prev) {
                return {
                  id: updatedRow.id,
                  email: updatedRow.email || currentUser.email || '',
                  displayName: updatedRow.full_name || currentUser.displayName || 'Pixel Builder',
                  photoURL: updatedRow.avatar_url || currentUser.photoURL || '',
                  role: updatedRow.role || 'user',
                  pixels: updatedRow.pixels || 0,
                  status: updatedRow.is_suspended ? 'suspended' : 'active',
                  bio: updatedRow.bio || '',
                  opportunitiesShared: updatedRow.opportunities_shared || 0,
                  approvedSubmissions: updatedRow.approved_submissions || 0,
                  referrals: updatedRow.referrals || 0,
                  contributions: updatedRow.contributions || 0,
                  badges: updatedRow.badges || [],
                  referralId: updatedRow.referral_id || '',
                  college: updatedRow.college || '',
                  course: updatedRow.course || '',
                  yearOfStudy: updatedRow.year_of_study || '',
                  branch: updatedRow.branch || '',
                  createdAt: new Date(updatedRow.created_at || Date.now()).getTime()
                };
              }

              return {
                ...prev,
                pixels: typeof updatedRow.pixels === 'number' ? updatedRow.pixels : prev.pixels,
                bio: updatedRow.bio ?? prev.bio,
                role: updatedRow.role ?? prev.role,
                displayName: updatedRow.full_name ?? prev.displayName,
                photoURL: updatedRow.avatar_url ?? prev.photoURL,
                status: updatedRow.is_suspended ? 'suspended' : 'active',
                opportunitiesShared: updatedRow.opportunities_shared ?? prev.opportunitiesShared,
                approvedSubmissions: updatedRow.approved_submissions ?? prev.approvedSubmissions,
                referrals: updatedRow.referrals ?? prev.referrals,
                contributions: updatedRow.contributions ?? prev.contributions,
                badges: updatedRow.badges ?? prev.badges,
                college: updatedRow.college ?? prev.college,
                course: updatedRow.course ?? prev.course,
                yearOfStudy: updatedRow.year_of_study ?? prev.yearOfStudy,
                branch: updatedRow.branch ?? prev.branch
              };
            });
          }
        }
      )
      .subscribe(() => {
        // Connected to postgres_changes
      });

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const incrementPixels = (delta: number, actionName?: string, reasonText?: string, idempotencyKey?: string) => {
    if (!currentUser?.id) return;

    // Persist optimistic state locally across all tabs and components
    setUserData((prev) => {
      if (!prev) return prev;
      const updatedPixels = Math.max(0, (prev.pixels || 0) + delta);
      try {
        localStorage.setItem(`pm_local_pixels_${currentUser.id}`, String(updatedPixels));
      } catch {}
      return { ...prev, pixels: updatedPixels };
    });

    // Asynchronously synchronize with server/ledger without crashing UI state
    (async () => {
      try {
        // 1. Try atomic server-side RPC execute_pixel_transaction
        const { data, error } = await (supabase.rpc as any)('execute_pixel_transaction', {
          p_user_id: currentUser.id,
          p_delta: delta,
          p_action: actionName || (delta >= 0 ? `Earned (+${delta} Pixels)` : `Deducted (${delta} Pixels)`),
          p_reason: reasonText || 'Community activity reward',
          p_type: delta >= 0 ? 'earn' : 'spend',
          p_idempotency_key: idempotencyKey || null
        });

        if (!error && data?.success && typeof data.pixels === 'number') {
          setUserData((prev) => (prev ? { ...prev, pixels: data.pixels } : prev));
          try {
            localStorage.setItem(`pm_local_pixels_${currentUser.id}`, String(data.pixels));
          } catch {}
          return;
        }

        // 2. Direct profiles table balance update fallback
        const { data: currentP } = await supabase
          .from('profiles')
          .select('pixels')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (currentP) {
          const currentBalance = typeof currentP.pixels === 'number' ? currentP.pixels : 0;
          const newBalance = Math.max(0, currentBalance + delta);

          const { error: updateErr } = await supabase
            .from('profiles')
            .update({ pixels: newBalance, updated_at: new Date().toISOString() })
            .eq('id', currentUser.id);

          if (!updateErr) {
            setUserData((prev) => (prev ? { ...prev, pixels: newBalance } : prev));
            try {
              localStorage.setItem(`pm_local_pixels_${currentUser.id}`, String(newBalance));
            } catch {}
          }
        }
      } catch (err) {
        console.warn('[incrementPixels] Backend sync notice:', err);
      }
    })();
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
