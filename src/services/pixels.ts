import { supabase } from '../lib/supabase';
import type { RewardConfig, PixelTransaction, User } from '../types';

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  shareOpportunity: 10,
  submitOpportunity: 20,
  approvedOpportunity: 50,
  referralSignup: 25,
  validReport: 15,
  dailyActivity: 5,
  profileCompletion: 10
};

// ==========================================
// 1. REWARD CONFIG SERVICE (Supabase)
// ==========================================

/**
 * Fetch centralized reward configuration from Supabase reward_config table
 */
export const getRewardConfig = async (): Promise<RewardConfig> => {
  try {
    const { data, error } = await supabase
      .from('reward_config')
      .select('*')
      .eq('id', 'rewards')
      .maybeSingle();

    if (error) {
      console.warn('[getRewardConfig] Note reading Supabase reward_config:', error.message);
      return DEFAULT_REWARD_CONFIG;
    }

    if (!data) {
      return DEFAULT_REWARD_CONFIG;
    }

    return {
      shareOpportunity: data.share_opportunity ?? DEFAULT_REWARD_CONFIG.shareOpportunity,
      submitOpportunity: data.submit_opportunity ?? DEFAULT_REWARD_CONFIG.submitOpportunity,
      approvedOpportunity: data.approved_opportunity ?? DEFAULT_REWARD_CONFIG.approvedOpportunity,
      referralSignup: data.referral_signup ?? DEFAULT_REWARD_CONFIG.referralSignup,
      validReport: data.valid_report ?? DEFAULT_REWARD_CONFIG.validReport,
      dailyActivity: data.daily_activity ?? DEFAULT_REWARD_CONFIG.dailyActivity,
      profileCompletion: data.profile_completion ?? DEFAULT_REWARD_CONFIG.profileCompletion ?? 10
    };
  } catch (err) {
    console.error('Exception fetching reward_config from Supabase:', err);
    return DEFAULT_REWARD_CONFIG;
  }
};

/**
 * Update centralized reward configuration in Supabase reward_config table (Admin only)
 */
export const updateRewardConfig = async (
  adminUser: { uid: string; email: string },
  newConfig: RewardConfig
): Promise<void> => {
  const payload = {
    id: 'rewards',
    share_opportunity: newConfig.shareOpportunity,
    submit_opportunity: newConfig.submitOpportunity,
    approved_opportunity: newConfig.approvedOpportunity,
    referral_signup: newConfig.referralSignup,
    valid_report: newConfig.validReport,
    daily_activity: newConfig.dailyActivity,
    profile_completion: newConfig.profileCompletion ?? 10,
    updated_at: new Date().toISOString(),
    updated_by: adminUser.uid
  };

  const { error } = await supabase
    .from('reward_config')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('Failed to update reward_config in Supabase:', error.message);
    throw new Error(error.message);
  }
};

// ==========================================
// 2. PIXEL BALANCE & TRANSACTIONS (Supabase)
// ==========================================

/**
 * Fetch a user's current Pixel balance from Supabase profiles table
 */
export const getUserPixelBalance = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('pixels')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return 0;
    }
    return data.pixels || 0;
  } catch {
    return 0;
  }
};

/**
 * Fetch Pixel transaction history from Supabase pixel_transactions table
 */
export const getPixelTransactions = async (userId?: string): Promise<PixelTransaction[]> => {
  try {
    let query = supabase
      .from('pixel_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching pixel_transactions from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      amount: row.amount,
      action: row.action || undefined,
      reason: row.reason && !row.reason.startsWith('feed_') ? row.reason : (row.action || 'Community activity reward'),
      type: row.type,
      idempotencyKey: (row as any).idempotency_key || undefined,
      createdAt: new Date(row.created_at).getTime()
    }));
  } catch (err) {
    console.error('Exception fetching pixel transactions:', err);
    return [];
  }
};

/**
 * Admin adjustment of user Pixels with mandatory reason and Supabase transaction logging
 */
export const adjustUserPixels = async (
  _adminUser: { uid: string; email: string },
  targetUserId: string,
  amount: number,
  reason: string
): Promise<void> => {
  const cleanReason = (reason || '').trim();
  if (!cleanReason || cleanReason.length < 3) {
    throw new Error('A meaningful adjustment reason is required (minimum 3 characters).');
  }

  if (amount === 0) {
    throw new Error('Adjustment amount cannot be zero.');
  }

  const { data, error } = await (supabase.rpc as any)('admin_adjust_user_pixels', {
    p_target_user_id: targetUserId,
    p_amount: amount,
    p_reason: cleanReason
  });

  if (error) {
    console.error('Failed to adjust user Pixels via RPC:', error.message);
    throw new Error(error.message);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to adjust user Pixels');
  }
};

// ==========================================
// 3. USER MANAGEMENT (Supabase profiles)
// ==========================================

/**
 * Fetch all registered users from Supabase profiles for Admin Users & Pixels panel
 */
export const getAllUsersAdmin = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error querying profiles table for admin:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.full_name || 'Pixel Builder',
      photoURL: row.avatar_url || '',
      role: row.role || 'user',
      pixels: row.pixels || 0,
      status: row.is_suspended ? 'suspended' : 'active',
      bio: row.bio || '',
      opportunitiesShared: row.opportunities_shared || 0,
      approvedSubmissions: row.approved_submissions || 0,
      referrals: row.referrals || 0,
      contributions: row.contributions || 0,
      badges: row.badges || [],
      referralId: row.referral_id || '',
      college: row.college || '',
      course: row.course || '',
      yearOfStudy: row.year_of_study || '',
      branch: row.branch || '',
      createdAt: new Date(row.created_at).getTime()
    }));
  } catch (err) {
    console.error('Exception fetching all users for admin:', err);
    return [];
  }
};

/**
 * Suspend or reactivate user in Supabase profiles
 */
export const toggleUserSuspension = async (
  _adminUser: { uid: string; email: string },
  targetUserId: string,
  newStatus: 'active' | 'suspended',
  _reason = 'Admin action'
): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({
      is_suspended: newStatus === 'suspended',
      updated_at: new Date().toISOString()
    })
    .eq('id', targetUserId);

  if (error) {
    console.error('Failed to toggle user suspension in Supabase:', error.message);
    throw new Error(error.message);
  }
};
