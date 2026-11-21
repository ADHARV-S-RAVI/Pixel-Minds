import { supabase } from '../lib/supabase';
import { recordReferralSignup } from './referrals';
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
    }

    if (!data) {
      // Fallback: If querying another user's public profile while non-admin, read from public_profiles view
      const { data: pubData } = await (supabase as any)
        .from('public_profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (pubData) {
        const rawPubName = pubData.full_name?.trim();
        const hasRealPubName = rawPubName && rawPubName.toLowerCase() !== 'pixel builder';
        return {
          id: pubData.id,
          email: '',
          displayName: (hasRealPubName ? rawPubName : undefined) || (pubData.username ? `@${pubData.username}` : 'Pixel Member'),
          username: pubData.username || undefined,
          photoURL: pubData.avatar_url || '',
          role: 'user',
          pixels: pubData.pixels || 0,
          status: 'active',
          bio: pubData.bio || '',
          opportunitiesShared: pubData.opportunities_shared || 0,
          approvedSubmissions: pubData.approved_submissions || 0,
          referrals: 0,
          contributions: pubData.contributions || 0,
          badges: pubData.badges || [],
          referralId: '',
          college: '',
          course: '',
          yearOfStudy: '',
          branch: '',
          createdAt: new Date(pubData.created_at).getTime()
        };
      }
      return null;
    }

    const rawDataName = data.full_name?.trim();
    const hasRealDataName = rawDataName && rawDataName.toLowerCase() !== 'pixel builder';
    return {
      id: data.id,
      email: data.email,
      displayName: (hasRealDataName ? rawDataName : undefined) || (data.username ? `@${data.username}` : (data.email ? data.email.split('@')[0] : 'Pixel Member')),
      username: data.username || undefined,
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
 * Generate a deterministic, clean fallback username from email or display name
 */
export const generateFallbackUsername = (email?: string, name?: string): string => {
  let base = '';
  if (email && email.includes('@')) {
    base = email.split('@')[0].toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
  }
  if (!base || base.length < 3) {
    if (name) {
      base = name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
    }
  }
  if (!base || base.length < 3) {
    base = 'pixel_builder';
  }
  base = base.replace(/_{2,}/g, '_').replace(/^_+|_+$/g, '');
  if (base.length > 15) {
    base = base.substring(0, 15);
  }
  if (base.length < 3) {
    base = (base + '_pm').substring(0, 15);
  }
  return base;
};

/**
 * Generate a unique username by verifying against database / RPC
 */
export const generateUniqueUsername = async (email?: string, name?: string): Promise<string> => {
  const base = generateFallbackUsername(email, name);
  try {
    const check = await checkUsernameAvailable(base);
    if (check.available) return base;
  } catch {}

  // Try random 3-4 digit suffixes
  for (let i = 0; i < 5; i++) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const candidate = `${base.substring(0, 14)}_${randomSuffix}`;
    try {
      const check = await checkUsernameAvailable(candidate);
      if (check.available) return candidate;
    } catch {}
  }

  return `${base.substring(0, 12)}_${Date.now().toString().slice(-4)}`;
};

/**
 * Create or ensure user profile exists in Supabase
 */
export const createUserProfile = async (uid: string, data: Partial<User>): Promise<User> => {
  const referralId = 'PM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const chosenUsername = data.username
    ? data.username.toLowerCase().trim()
    : generateFallbackUsername(data.email, data.displayName);

  const insertPayload: any = {
    id: uid,
    email: data.email || '',
    full_name: data.displayName || 'New User',
    username: chosenUsername,
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

  let { error } = await supabase
    .from('profiles')
    .upsert(insertPayload, { onConflict: 'id' });

  // Schema cache resilience: if 'username' column is not in PostgREST schema cache yet
  if (error && (error.message?.includes("'username'") || (error as any).code === 'PGRST204')) {
    console.warn('[createUserProfile] Schema cache does not have username column yet, retrying without username');
    delete insertPayload.username;
    const retry = await supabase
      .from('profiles')
      .upsert(insertPayload, { onConflict: 'id' });
    error = retry.error;
  }

  if (error) {
    console.warn('Profile upsert note (trigger might have handled it):', error.message);
  }

  // Check and process pending referral code if available
  try {
    const pendingRef = typeof window !== 'undefined'
      ? (sessionStorage.getItem('pm_ref_code') || localStorage.getItem('pm_ref_code'))
      : null;
    if (pendingRef) {
      await recordReferralSignup(pendingRef, uid);
      localStorage.setItem(`pm_ref_onboarded_${uid}`, 'true');
      sessionStorage.removeItem('pm_ref_code');
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
    username: insertPayload.username || undefined,
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
    username?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    college?: string | null;
    course?: string | null;
    year_of_study?: string | null;
    branch?: string | null;
  } = {};
  if (data.displayName !== undefined) updates.full_name = data.displayName;
  if (data.username !== undefined) updates.username = data.username ? data.username.toLowerCase().trim() : null;
  if (data.photoURL !== undefined) updates.avatar_url = data.photoURL;
  if (data.bio !== undefined) updates.bio = data.bio;
  if (data.college !== undefined) updates.college = data.college;
  if (data.course !== undefined) updates.course = data.course;
  if (data.yearOfStudy !== undefined) updates.year_of_study = data.yearOfStudy;
  if (data.branch !== undefined) updates.branch = data.branch;

  if (Object.keys(updates).length === 0) return;

  let { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', uid);

  // Schema cache resilience: if 'username' column is not in PostgREST schema cache yet
  if (error && (error.message?.includes("'username'") || (error as any).code === 'PGRST204') && updates.username !== undefined) {
    console.warn('[updateUserProfile] Schema cache does not have username column yet, retrying without username');
    delete updates.username;
    if (Object.keys(updates).length > 0) {
      const retry = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', uid);
      error = retry.error;
    } else {
      error = null;
    }
  }

  if (error) {
    console.error('Error updating profile:', error.message);
    throw error;
  }
};

/**
 * Validate and check unique username availability
 */
export const checkUsernameAvailable = async (
  username: string,
  excludeUserId?: string
): Promise<{ available: boolean; error?: string }> => {
  const normalized = (username || '').toLowerCase().trim();
  if (!normalized) {
    return { available: false, error: 'Username is required.' };
  }
  if (normalized.length < 3) {
    return { available: false, error: 'Username must be at least 3 characters.' };
  }
  if (normalized.length > 20) {
    return { available: false, error: 'Username cannot exceed 20 characters.' };
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(normalized)) {
    return { available: false, error: 'Only letters, numbers, and underscores allowed.' };
  }

  // 1. Try RPC check_username_available
  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('check_username_available', {
      p_username: normalized,
      p_exclude_user_id: excludeUserId || null
    });
    if (!rpcError && rpcData && typeof rpcData.available === 'boolean') {
      return rpcData;
    }
  } catch {
    // Fallback to direct table check
  }

  // 2. Direct database query fallback
  try {
    let query = supabase
      .from('profiles')
      .select('id')
      .ilike('username', normalized);

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query.maybeSingle();
    if (error && error.code !== 'PGRST116') {
      if (error.message?.includes("'username'") || (error as any).code === 'PGRST204') {
        console.warn('[checkUsernameAvailable] Schema cache does not have username column yet, assuming available');
        return { available: true };
      }
      console.warn('[checkUsernameAvailable] Query note:', error.message);
    }

    if (data) {
      return { available: false, error: 'This username is already taken.' };
    }
    return { available: true };
  } catch (err: any) {
    return { available: false, error: err?.message || 'Error checking username availability.' };
  }
};

/**
 * Fetch public user profile by unique username
 */
export const getUserProfileByUsername = async (username: string): Promise<User | null> => {
  if (!username) return null;
  const clean = username.replace(/^@/, '').toLowerCase().trim();
  try {
    const { data, error } = await (supabase as any)
      .from('public_profiles')
      .select('*')
      .ilike('username', clean)
      .maybeSingle();

    if (error || !data) return null;

    const rawDataName = data.full_name?.trim();
    const hasRealDataName = rawDataName && rawDataName.toLowerCase() !== 'pixel builder';
    return {
      id: data.id,
      email: '',
      displayName: (hasRealDataName ? rawDataName : undefined) || (data.username ? `@${data.username}` : 'Pixel Member'),
      username: data.username || undefined,
      photoURL: data.avatar_url || '',
      role: 'user',
      pixels: data.pixels || 0,
      status: 'active',
      bio: data.bio || '',
      opportunitiesShared: data.opportunities_shared || 0,
      approvedSubmissions: data.approved_submissions || 0,
      referrals: 0,
      contributions: data.contributions || 0,
      badges: data.badges || [],
      referralId: '',
      college: '',
      course: '',
      yearOfStudy: '',
      branch: '',
      createdAt: new Date(data.created_at).getTime()
    };
  } catch {
    return null;
  }
};

/**
 * Real-time username mention search for @ tagging in posts and comments
 */
export const searchUsernamesForMention = async (
  query: string,
  limit = 5
): Promise<Array<{ id: string; username: string; displayName: string; photoURL?: string }>> => {
  const clean = (query || '').replace(/^@/, '').toLowerCase().trim();

  // 1. Try RPC search_usernames_for_mention
  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('search_usernames_for_mention', {
      p_query: clean,
      p_limit: limit
    });
    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      return rpcData.map((u: any) => ({
        id: u.id,
        username: u.username || (u.full_name ? u.full_name.replace(/\s+/g, '_').toLowerCase() : 'user'),
        displayName: (u.full_name && u.full_name !== 'Pixel Builder') ? u.full_name : (u.username ? `@${u.username}` : 'Pixel Member'),
        photoURL: u.avatar_url || undefined
      }));
    }
  } catch {}

  // 2. Direct public_profiles view lookup
  try {
    let dbQuery = (supabase as any)
      .from('public_profiles')
      .select('id, username, full_name, avatar_url');

    if (clean) {
      dbQuery = dbQuery.or(`username.ilike.%${clean}%,full_name.ilike.%${clean}%`);
    }

    const { data: pubData } = await dbQuery.limit(limit);
    if (pubData && pubData.length > 0) {
      return pubData.map((u: any) => ({
        id: u.id,
        username: u.username || (u.full_name ? u.full_name.replace(/\s+/g, '_').toLowerCase() : 'user'),
        displayName: (u.full_name && u.full_name !== 'Pixel Builder') ? u.full_name : (u.username ? `@${u.username}` : 'Pixel Member'),
        photoURL: u.avatar_url || undefined
      }));
    }
  } catch {}

  // 3. Fallback: search profiles table directly
  try {
    let profQuery = supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url');

    if (clean) {
      profQuery = profQuery.or(`username.ilike.%${clean}%,full_name.ilike.%${clean}%`);
    }

    const { data: profData } = await profQuery.limit(limit);
    if (profData && profData.length > 0) {
      return profData.map((u: any) => ({
        id: u.id,
        username: u.username || (u.full_name ? u.full_name.replace(/\s+/g, '_').toLowerCase() : 'user'),
        displayName: (u.full_name && u.full_name !== 'Pixel Builder') ? u.full_name : (u.username ? `@${u.username}` : 'Pixel Member'),
        photoURL: u.avatar_url || undefined
      }));
    }
  } catch {}

  // 4. Fallback: recent community post authors
  try {
    let postQuery = supabase
      .from('community_posts')
      .select('user_id, author_name')
      .limit(10);
    if (clean) {
      postQuery = postQuery.ilike('author_name', `%${clean}%`);
    }
    const { data: recentAuthors } = await postQuery;
    if (recentAuthors && Array.isArray(recentAuthors) && recentAuthors.length > 0) {
      const seen = new Set<string>();
      const results: any[] = [];
      for (const a of recentAuthors) {
        if (!a.user_id || seen.has(a.user_id)) continue;
        seen.add(a.user_id);
        const name = a.author_name || 'Pixel Member';
        results.push({
          id: a.user_id,
          username: name.replace(/\s+/g, '_').toLowerCase(),
          displayName: name,
          photoURL: undefined
        });
        if (results.length >= limit) break;
      }
      return results;
    }
  } catch {}

  return [];
};

export interface LeaderboardUserEntry {
  id: string;
  rank: number;
  name: string;
  pixels: number;
  contribs: number;
  avatarUrl?: string;
  role: string;
}

export interface LeaderboardResponse {
  users: LeaderboardUserEntry[];
  totalCount: number;
}

/**
 * Fetch top users for the community leaderboard from Supabase public.public_profiles view.
 * Strictly limits to top 20, using consistent tie-breaking (pixels DESC, created_at ASC).
 * Returns both the top entries and the exact total eligible count.
 */
export const getLeaderboardUsers = async (limitCount = 20): Promise<LeaderboardResponse> => {
  try {
    const { data, count, error } = await (supabase as any)
      .from('public_profiles')
      .select('id, full_name, username, pixels, avatar_url, contributions', { count: 'exact' })
      .order('pixels', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limitCount);

    let rows = data;
    let totalCount = count;

    if (error) {
      // Graceful fallback to profiles table directly if public_profiles view is not yet created remotely
      const { data: profData, count: profCount, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, username, pixels, avatar_url, contributions', { count: 'exact' })
        .eq('is_suspended', false)
        .order('pixels', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limitCount);

      if (!profError && Array.isArray(profData)) {
        rows = profData;
        totalCount = profCount;
      } else {
        return { users: [], totalCount: 0 };
      }
    }

    const resolvedCount = totalCount ?? (rows?.length || 0);

    const users: LeaderboardUserEntry[] = (rows || []).map((p: any, idx: number) => {
      const rawName = p.full_name?.trim();
      const hasRealName = rawName && rawName.toLowerCase() !== 'pixel builder';
      return {
        id: p.id,
        rank: idx + 1,
        name: (hasRealName ? rawName : undefined) || (p.username ? `@${p.username}` : 'Pixel Member'),
        pixels: p.pixels || 0,
        contribs: p.contributions || 0,
        avatarUrl: p.avatar_url || undefined,
        role: 'user'
      };
    });

    return { users, totalCount: resolvedCount };
  } catch {
    return { users: [], totalCount: 0 };
  }
};

/**
 * Calculate the user's exact global ranking on the leaderboard.
 * Uses consistent tie-breaking with leaderboard (pixels DESC, created_at ASC).
 * Head query ensures minimal network bandwidth.
 */
export const getUserGlobalRank = async (
  userId: string
): Promise<{ rank: number | null; totalUsers: number }> => {
  if (!userId) return { rank: null, totalUsers: 0 };

  try {
    const { data: userProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('pixels, created_at, is_suspended')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr || !userProfile || userProfile.is_suspended) {
      return { rank: null, totalUsers: 0 };
    }

    const userPixels = userProfile.pixels || 0;
    const userCreatedAt = userProfile.created_at;

    // Count how many eligible non-suspended users rank strictly ahead:
    // (higher pixels) OR (same pixels AND earlier registration created_at)
    const { count: higherCount, error: countErr } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_suspended', false)
      .or(`pixels.gt.${userPixels},and(pixels.eq.${userPixels},created_at.lt.${userCreatedAt})`);

    const { count: totalCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_suspended', false);

    if (countErr) {
      console.warn('[getUserGlobalRank] Count query note:', countErr.message);
      return { rank: null, totalUsers: totalCount ?? 0 };
    }

    const rank = (higherCount ?? 0) + 1;
    return { rank, totalUsers: totalCount ?? 0 };
  } catch (err) {
    console.error('[getUserGlobalRank] Exception:', err);
    return { rank: null, totalUsers: 0 };
  }
};
