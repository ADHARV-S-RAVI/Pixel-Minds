import { supabase } from '../lib/supabase';
import type { Referral } from '../types';
import { getRewardConfig } from './pixels';

/**
 * Fetch all real referrals made by the authenticated user
 */
export const getUserReferrals = async (userId: string): Promise<Referral[]> => {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        id,
        referrer_id,
        referred_user_id,
        referral_code,
        pixels_rewarded,
        opportunity_id,
        status,
        created_at
      `)
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getUserReferrals] Error querying referrals table:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Fetch profile info for the referred users
    const referredUserIds = [...new Set(data.map((r) => r.referred_user_id).filter(Boolean))];
    const userMap = new Map<string, { full_name: string; email: string; avatar_url?: string }>();

    if (referredUserIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', referredUserIds);

      (profilesData || []).forEach((p) => {
        userMap.set(p.id, {
          full_name: p.full_name || 'Pixel Builder',
          email: p.email || '',
          avatar_url: p.avatar_url || ''
        });
      });
    }

    // Optional: fetch opportunity titles if opportunity_id is present
    const oppIds = [...new Set(data.map((r) => r.opportunity_id).filter(Boolean))] as string[];
    const oppMap = new Map<string, string>();

    if (oppIds.length > 0) {
      const { data: oppsData } = await supabase
        .from('opportunities')
        .select('id, title')
        .in('id', oppIds);

      (oppsData || []).forEach((o) => {
        oppMap.set(o.id, o.title);
      });
    }

    return data.map((r) => {
      const userProfile = userMap.get(r.referred_user_id);
      return {
        id: r.id,
        referrerId: r.referrer_id,
        referredUserId: r.referred_user_id,
        referralCode: r.referral_code,
        pixelsRewarded: r.pixels_rewarded || 25,
        opportunityId: r.opportunity_id,
        status: (r.status as 'pending' | 'completed' | 'rejected') || 'completed',
        referredUserName: userProfile?.full_name || 'New Member',
        referredUserEmail: userProfile?.email || '',
        referredUserAvatar: userProfile?.avatar_url || '',
        opportunityTitle: r.opportunity_id ? oppMap.get(r.opportunity_id) || 'Pixel Minds Invitation' : 'Pixel Minds Invitation',
        createdAt: new Date(r.created_at).getTime()
      };
    });
  } catch (err) {
    console.error('[getUserReferrals] Exception:', err);
    return [];
  }
};

/**
 * Aggregate real referral statistics for a user
 */
export const getReferralStats = async (
  userId: string
): Promise<{ referredCount: number; joinedCount: number; pixelsEarned: number }> => {
  const referrals = await getUserReferrals(userId);
  const referredCount = referrals.length;
  const joinedCount = referrals.filter((r) => r.status === 'completed').length;
  const pixelsEarned = referrals
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + (r.pixelsRewarded || 25), 0);

  return { referredCount, joinedCount, pixelsEarned };
};

/**
 * Record a referral signup when a new user registers with a referral code.
 * Invokes the secure server-side claim_referral_code RPC to award Pixels atomically.
 */
export const recordReferralSignup = async (
  referralCode: string,
  newUserId: string,
  opportunityId?: string
): Promise<{ success: boolean; message?: string }> => {
  if (!referralCode || !newUserId) {
    return { success: false, message: 'Invalid referral code or user ID.' };
  }

  const cleanCode = referralCode.trim().toUpperCase();

  try {
    // 1. Primary path: Invoke the secure claim_referral_code RPC
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)('claim_referral_code', {
      p_referral_code: cleanCode,
      p_opportunity_id: opportunityId || null
    });

    if (!rpcErr && rpcData) {
      if (rpcData.success === true) {
        console.log('[recordReferralSignup] Referral claimed successfully via RPC:', rpcData);
        return { success: true, message: rpcData.message || 'Referral applied successfully.' };
      }
      return {
        success: false,
        message: rpcData.error || rpcData.message || 'Failed to claim referral.'
      };
    }

    // 2. Fallback if RPC is pending deployment in Supabase
    console.warn('[recordReferralSignup] RPC not available or failed, using client check:', rpcErr?.message);

    const { data: referrer, error: referrerErr } = await supabase
      .from('profiles')
      .select('id, full_name, pixels, referrals, referral_id')
      .eq('referral_id', cleanCode)
      .maybeSingle();

    if (referrerErr || !referrer) {
      return { success: false, message: 'Referral code not found.' };
    }

    if (referrer.id === newUserId) {
      return { success: false, message: 'Self-referrals are not permitted.' };
    }

    const { data: existingRef } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_user_id', newUserId)
      .maybeSingle();

    if (existingRef) {
      return { success: false, message: 'User has already joined via a referral link.' };
    }

    const rewardConfig = await getRewardConfig();
    const rewardAmount = rewardConfig.referralSignup || 25;

    const { error: insertRefErr } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referred_user_id: newUserId,
        referral_code: cleanCode,
        pixels_rewarded: rewardAmount,
        opportunity_id: opportunityId || null,
        status: 'completed'
      });

    if (insertRefErr) {
      return { success: false, message: insertRefErr.message };
    }

    return { success: true, message: `Referral applied! +${rewardAmount} Pixels for ${referrer.full_name || 'referrer'}.` };
  } catch (err: any) {
    console.error('[recordReferralSignup] Exception:', err);
    return { success: false, message: err?.message || 'Unable to record referral.' };
  }
};


/**
 * Validate a referral or coupon code before signup.
 * Informs user if they entered a coupon code (since coupons require a dedicated coupon system).
 */
export const validateReferralCode = async (
  code: string
): Promise<{ valid: boolean; message: string; referrerName?: string; referrerId?: string }> => {
  if (!code || !code.trim()) {
    return { valid: false, message: 'Please enter a referral or coupon code.' };
  }

  const cleanCode = code.trim().toUpperCase();

  // If input looks like a discount / promo coupon code
  if (
    cleanCode.startsWith('CP-') ||
    cleanCode.startsWith('COUPON') ||
    cleanCode.includes('DISCOUNT') ||
    cleanCode.includes('PROMO') ||
    cleanCode.includes('OFF')
  ) {
    return {
      valid: false,
      message: 'Coupons are currently unavailable. Please enter a valid Pixel Minds referral code.'
    };
  }

  try {
    // 1. Try validate_referral_code RPC first
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)('validate_referral_code', {
      p_code: cleanCode
    });

    if (!rpcErr && rpcData) {
      return {
        valid: Boolean(rpcData.valid),
        message: rpcData.message || (rpcData.valid ? 'Valid referral code!' : 'Invalid referral code.'),
        referrerName: rpcData.referrer_name,
        referrerId: rpcData.referrer_id
      };
    }

    // 2. Direct profiles table fallback
    const { data: referrer, error } = await supabase
      .from('profiles')
      .select('id, full_name, referral_id')
      .eq('referral_id', cleanCode)
      .maybeSingle();

    if (error || !referrer) {
      return {
        valid: false,
        message: 'Invalid referral code. Please check the code and try again.'
      };
    }

    return {
      valid: true,
      message: `Valid referral from ${referrer.full_name || 'Pixel Builder'}!`,
      referrerName: referrer.full_name || 'Pixel Builder',
      referrerId: referrer.id
    };
  } catch (err: any) {
    console.error('[validateReferralCode] Error:', err);
    return { valid: false, message: 'Unable to validate code at this time. Please try again.' };
  }
};
