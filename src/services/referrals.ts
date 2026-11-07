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
 * Prevents self-referrals and duplicate rewards.
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
    // 1. Look up referrer by their unique referral_id
    const { data: referrer, error: referrerErr } = await supabase
      .from('profiles')
      .select('id, full_name, pixels, referrals, referral_id')
      .eq('referral_id', cleanCode)
      .maybeSingle();

    if (referrerErr || !referrer) {
      return { success: false, message: 'Referral code not found.' };
    }

    // 2. Prevent self-referrals
    if (referrer.id === newUserId) {
      return { success: false, message: 'Self-referrals are not permitted.' };
    }

    // 3. Prevent duplicate referral records for the same referred user
    const { data: existingRef } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_user_id', newUserId)
      .maybeSingle();

    if (existingRef) {
      return { success: false, message: 'User has already joined via a referral link.' };
    }

    // 4. Get reward amount from reward_config
    const rewardConfig = await getRewardConfig();
    const rewardAmount = rewardConfig.referralSignup || 25;

    // 5. Insert referral row into Supabase referrals table
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
      console.error('[recordReferralSignup] Failed to insert referral row:', insertRefErr.message);
      return { success: false, message: insertRefErr.message };
    }

    // 6. Record pixel reward transaction for referrer in pixel_transactions table
    const { error: txErr } = await supabase
      .from('pixel_transactions')
      .insert({
        user_id: referrer.id,
        amount: rewardAmount,
        action: `Referral Reward (+${rewardAmount} Pixels)`,
        reason: 'A new member joined Pixel Minds with your referral link',
        type: 'earn'
      });

    if (txErr) {
      console.warn('[recordReferralSignup] Note inserting pixel transaction:', txErr.message);
      // Fallback: manually increment referrer balance if trigger didn't fire
      await supabase
        .from('profiles')
        .update({
          pixels: (referrer.pixels || 0) + rewardAmount,
          referrals: (referrer.referrals || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', referrer.id);
    } else {
      // Update the referrer's referrals count
      await supabase
        .from('profiles')
        .update({
          referrals: (referrer.referrals || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', referrer.id);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[recordReferralSignup] Exception:', err);
    return { success: false, message: err.message };
  }
};


/**
 * Validate a referral or coupon code before signup.
 * Informs user if they entered a coupon code (since coupons require a dedicated coupon system).
 */
export const validateReferralCode = async (
  code: string
): Promise<{ valid: boolean; message: string; referrerName?: string }> => {
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
      message: 'Coupons are currently unavailable. Please enter a valid Pixel Minds referral code (format: PM-XXXXXX).'
    };
  }

  try {
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
      referrerName: referrer.full_name || 'Pixel Builder'
    };
  } catch (err: any) {
    console.error('[validateReferralCode] Error:', err);
    return { valid: false, message: 'Unable to validate code at this time. Please try again.' };
  }
};
