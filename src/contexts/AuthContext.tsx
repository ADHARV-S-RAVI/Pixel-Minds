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
  loginWithGoogle: () => Promise<void>;
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
  ) => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  user: null,
  userProfile: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  signupWithEmail: async () => {},
  resetPasswordForEmail: async () => {},
  updatePassword: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
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
    // 1. Check active session on initial load
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          const authUser = formatAuthUser(session.user);
          setCurrentUser(authUser);
          await fetchProfile(session.user.id, session.user);
        } else {
          setCurrentUser(null);
          setUserData(null);
        }
      } catch (err) {
        console.error('Error initializing auth session:', err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // 2. Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const authUser = formatAuthUser(session.user);
        setCurrentUser(authUser);
        await fetchProfile(session.user.id, session.user);
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
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
  };

  const resetPasswordForEmail = async (email: string) => {
    const redirectTo = `${window.location.origin}/reset-password`;
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
        resetPasswordForEmail,
        updatePassword,
        logout,
        refreshProfile
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
