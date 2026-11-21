import { supabase } from '../lib/supabase';
import type { Referral } from '../types';

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
      const { data: profilesData } = await (supabase as any)
        .from('public_profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', referredUserIds);

      (profilesData || []).forEach((p: any) => {
        userMap.set(p.id, {
          full_name: p.full_name?.trim() || (p.username ? `@${p.username}` : 'Pixel Member'),
          email: '',
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
    // Invoke the secure, atomic claim_referral_code RPC (validates auth.uid(), prevents self/dup, credits ledger)
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)('claim_referral_code', {
      p_referral_code: cleanCode,
      p_opportunity_id: opportunityId || null
    });

    if (rpcErr) {
      console.error('[recordReferralSignup] RPC error:', rpcErr);
      return {
        success: false,
        message: rpcErr.message || 'Unable to process referral at this time.'
      };
    }

    if (rpcData) {
      if (rpcData.success === true) {
        console.log('[recordReferralSignup] Referral claimed successfully via RPC:', rpcData);
        return {
          success: true,
          message: rpcData.message || 'Referral applied successfully!'
        };
      }
      return {
        success: false,
        message: rpcData.error || rpcData.message || 'Failed to claim referral code.'
      };
    }

    return { success: false, message: 'Invalid response from referral service.' };
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
    // 1. Try validate_referral_code RPC first (returns TABLE: valid, referrer_id, referrer_name)
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)('validate_referral_code', {
      p_code: cleanCode
    });

    if (!rpcErr && rpcData) {
      const res = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (res && res.valid) {
        return {
          valid: true,
          message: `Valid referral from ${res.referrer_name || 'Pixel Member'}!`,
          referrerName: res.referrer_name || 'Pixel Member',
          referrerId: res.referrer_id
        };
      }
    }

    // 2. Direct profiles table fallback (if user is authenticated admin or self)
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
      message: `Valid referral from ${referrer.full_name || 'Pixel Member'}!`,
      referrerName: referrer.full_name || 'Pixel Member',
      referrerId: referrer.id
    };
  } catch (err: any) {
    console.error('[validateReferralCode] Error:', err);
    return { valid: false, message: 'Unable to validate code at this time. Please try again.' };
  }
};
