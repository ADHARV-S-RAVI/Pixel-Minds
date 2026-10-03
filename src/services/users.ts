import { supabase } from '../lib/supabase';
import type { User } from '../types';

/**
 * Fetch a user profile from Supabase profiles table
 */
export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error) {
      console.error('[getUserProfile Debug] Error querying profiles table:', error.message, error.details);
      return null;
    }

    if (!data) {
      console.warn('[getUserProfile Debug] No row found in public.profiles for ID:', uid);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      displayName: data.full_name || 'Pixel Builder',
      photoURL: data.avatar_url || '',
      role: data.role || 'user',
      pixels: data.pixels || 0,
      status: data.is_suspended ? 'suspended' : 'active',
      bio: data.bio || '',
      opportunitiesShared: data.opportunities_shared || 0,
      approvedSubmissions: data.approved_submissions || 0,
      referrals: data.referrals || 0,
      contributions: data.contributions || 0,
      badges: data.badges || [],
      referralId: data.referral_id || '',
      college: data.college || '',
      course: data.course || '',
      yearOfStudy: data.year_of_study || '',
      branch: data.branch || '',
      createdAt: new Date(data.created_at).getTime()
    };
  } catch (err) {
    console.error('Exception fetching user profile:', err);
    return null;
  }
};

/**
 * Create or ensure user profile exists in Supabase
 */
export const createUserProfile = async (uid: string, data: Partial<User>): Promise<User> => {
  const referralId = 'PM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const insertPayload = {
    id: uid,
    email: data.email || '',
    full_name: data.displayName || 'New User',
    avatar_url: data.photoURL || '',
    role: 'user' as const, // Strict enforcement: only 'user' on signup
    pixels: 0,
    is_suspended: false,
    referral_id: referralId,
    college: data.college || null,
    course: data.course || null,
    year_of_study: data.yearOfStudy || null,
    branch: data.branch || null
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(insertPayload, { onConflict: 'id' });

  if (error) {
    console.warn('Profile upsert note (trigger might have handled it):', error.message);
  }

  // Check and process pending referral code if available
  try {
    const pendingRef = typeof window !== 'undefined' ? localStorage.getItem('pm_ref_code') : null;
    if (pendingRef) {
      const { recordReferralSignup } = await import('./referrals');
      await recordReferralSignup(pendingRef, uid);
      localStorage.removeItem('pm_ref_code');
    }
  } catch (err) {
    console.warn('[createUserProfile] Referral processing note:', err);
  }

  // Return loaded profile
  const loaded = await getUserProfile(uid);
  if (loaded) return loaded;

  return {
    id: uid,
    email: data.email || '',
    displayName: data.displayName || 'New User',
    photoURL: data.photoURL || '',
    role: 'user',
    pixels: 0,
    status: 'active',
    opportunitiesShared: 0,
    approvedSubmissions: 0,
    referrals: 0,
    contributions: 0,
    badges: [],
    referralId,
    college: data.college || '',
    course: data.course || '',
    yearOfStudy: data.yearOfStudy || '',
    branch: data.branch || '',
    createdAt: Date.now()
  };
};

/**
 * Update safe user profile fields in Supabase
 */
export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<void> => {
  const updates: {
    full_name?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    college?: string | null;
    course?: string | null;
    year_of_study?: string | null;
    branch?: string | null;
  } = {};
  if (data.displayName !== undefined) updates.full_name = data.displayName;
  if (data.photoURL !== undefined) updates.avatar_url = data.photoURL;
  if (data.bio !== undefined) updates.bio = data.bio;
  if (data.college !== undefined) updates.college = data.college;
  if (data.course !== undefined) updates.course = data.course;
  if (data.yearOfStudy !== undefined) updates.year_of_study = data.yearOfStudy;
  if (data.branch !== undefined) updates.branch = data.branch;

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', uid);

  if (error) {
    console.error('Error updating profile:', error.message);
    throw error;
  }
};
