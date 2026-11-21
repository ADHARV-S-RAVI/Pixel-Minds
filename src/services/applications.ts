import { supabase } from '../lib/supabase';
import { sendRegistrationConfirmationEmail } from './emailService';

export interface UserApplication {
  id: string;
  userId: string;
  opportunityId: string;
  opportunityTitle: string;
  organizer: string;
  category: string;
  mode: string;
  deadline: string;
  officialUrl: string;
  appliedAt: number;
  status: 'pending_confirmation' | 'confirmed';
  confirmedAt?: number;
  rewardClaimed: boolean;
  pixelsRewarded?: number;
}

const STORAGE_KEY_PREFIX = 'pm_user_applications_';

const userAppsTable = () => (supabase.from('user_applications' as any) as any);

const parseEpochMs = (val: any, fallback?: any): number => {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (val !== null && val !== undefined) {
    const num = Number(val);
    if (!isNaN(num) && num > 0) return num;
    const dateParsed = new Date(val).getTime();
    if (!isNaN(dateParsed)) return dateParsed;
  }
  if (fallback !== null && fallback !== undefined) {
    const fallbackNum = Number(fallback);
    if (!isNaN(fallbackNum) && fallbackNum > 0) return fallbackNum;
    const fallbackDate = new Date(fallback).getTime();
    if (!isNaN(fallbackDate)) return fallbackDate;
  }
  return Date.now();
};

const getLocalStorageApplications = (userId: string): UserApplication[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalStorageApplications = (userId: string, apps: UserApplication[]) => {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(apps));
  } catch (err) {
    console.warn('Failed to save applications to localStorage:', err);
  }
};

/**
 * Fetch all applications for the current user.
 */
export const getUserApplications = async (userId: string): Promise<UserApplication[]> => {
  if (!userId) return [];

  const localApps = getLocalStorageApplications(userId);

  // Try fetching from Supabase if table exists
  try {
    const { data, error } = await userAppsTable()
      .select('*')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const remoteApps: UserApplication[] = data.map((row: any) => ({
        id: String(row.id),
        userId: row.user_id,
        opportunityId: row.opportunity_id,
        opportunityTitle: row.opportunity_title,
        organizer: row.opportunity_organizer || row.organizer || '',
        category: row.opportunity_category || row.category || 'Opportunities',
        mode: row.mode || 'Online',
        deadline: row.deadline || '',
        officialUrl: row.official_url || '',
        appliedAt: parseEpochMs(row.applied_at, row.created_at),
        status: row.status || 'pending_confirmation',
        confirmedAt: row.confirmed_at ? parseEpochMs(row.confirmed_at) : undefined,
        rewardClaimed: Boolean(row.reward_claimed),
        pixelsRewarded: row.pixels_rewarded || 10
      }));

      // Merge remote with local (keeping most up to date status)
      const mergedMap = new Map<string, UserApplication>();
      localApps.forEach(a => mergedMap.set(a.opportunityId, a));
      remoteApps.forEach(a => {
        const existing = mergedMap.get(a.opportunityId);
        if (!existing || a.status === 'confirmed') {
          mergedMap.set(a.opportunityId, a);
        }
      });

      const merged = Array.from(mergedMap.values()).sort((a, b) => b.appliedAt - a.appliedAt);
      saveLocalStorageApplications(userId, merged);
      return merged;
    }
  } catch (err) {
    console.warn('Supabase user_applications query note:', err);
  }

  return localApps.sort((a, b) => b.appliedAt - a.appliedAt);
};

/**
 * Record that a user clicked the apply link for an opportunity.
 * Initiates the 3-minute verification cooldown period before pixels can be claimed.
 */
export const recordOpportunityApplication = async (
  userId: string,
  opp: {
    id: string;
    title: string;
    organizer?: string;
    category?: string;
    mode?: string;
    deadline?: string;
    officialUrl?: string;
  },
  _userEmail?: string,
  _userName?: string
): Promise<UserApplication> => {
  // Use active Supabase session user ID if available
  const { data: sessionData } = await supabase.auth.getSession();
  const effectiveUserId = sessionData?.session?.user?.id || userId;

  const localApps = getLocalStorageApplications(effectiveUserId);
  const existing = localApps.find(a => String(a.opportunityId) === String(opp.id));

  if (existing) {
    return existing;
  }

  // Check if application was already recorded in Supabase (e.g. from another device/browser)
  try {
    const { data: remoteExisting } = await userAppsTable()
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('opportunity_id', String(opp.id))
      .maybeSingle();

    if (remoteExisting) {
      const existingApp: UserApplication = {
        id: String(remoteExisting.id),
        userId: remoteExisting.user_id,
        opportunityId: remoteExisting.opportunity_id,
        opportunityTitle: remoteExisting.opportunity_title,
        organizer: remoteExisting.opportunity_organizer || remoteExisting.organizer || '',
        category: remoteExisting.opportunity_category || remoteExisting.category || 'Opportunities',
        mode: remoteExisting.mode || 'Online',
        deadline: remoteExisting.deadline || '',
        officialUrl: remoteExisting.official_url || '',
        appliedAt: parseEpochMs(remoteExisting.applied_at, remoteExisting.created_at),
        status: remoteExisting.status || 'pending_confirmation',
        confirmedAt: remoteExisting.confirmed_at ? parseEpochMs(remoteExisting.confirmed_at) : undefined,
        rewardClaimed: Boolean(remoteExisting.reward_claimed),
        pixelsRewarded: remoteExisting.pixels_rewarded || 10
      };
      saveLocalStorageApplications(effectiveUserId, [existingApp, ...localApps.filter(a => a.opportunityId !== String(opp.id))]);
      return existingApp;
    }
  } catch (err) {
    console.warn('[applications] Remote existing check note:', err);
  }

  // 1. Authoritative insert to Supabase first
  const { data: insertedData, error: insertError } = await userAppsTable().insert({
    user_id: effectiveUserId,
    opportunity_id: String(opp.id),
    opportunity_title: opp.title,
    opportunity_organizer: opp.organizer || 'Official Host',
    opportunity_category: opp.category || 'Opportunities',
    mode: opp.mode || 'Online',
    deadline: opp.deadline || 'Closing Soon',
    official_url: opp.officialUrl || '',
    applied_at: Date.now(),
    status: 'pending_confirmation',
    reward_claimed: false,
    pixels_rewarded: 0
  }).select('*').maybeSingle();

  if (insertError) {
    // If unique constraint violation, application was already recorded
    if ((insertError as any).code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('uq_user_applications')) {
      const { data: existingAppRow } = await userAppsTable()
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('opportunity_id', String(opp.id))
        .maybeSingle();

      if (existingAppRow) {
        const existingApp: UserApplication = {
          id: String(existingAppRow.id),
          userId: existingAppRow.user_id,
          opportunityId: existingAppRow.opportunity_id,
          opportunityTitle: existingAppRow.opportunity_title,
          organizer: existingAppRow.opportunity_organizer || existingAppRow.organizer || '',
          category: existingAppRow.opportunity_category || existingAppRow.category || 'Opportunities',
          mode: existingAppRow.mode || 'Online',
          deadline: existingAppRow.deadline || '',
          officialUrl: existingAppRow.official_url || '',
          appliedAt: parseEpochMs(existingAppRow.applied_at, existingAppRow.created_at),
          status: existingAppRow.status || 'pending_confirmation',
          confirmedAt: existingAppRow.confirmed_at ? parseEpochMs(existingAppRow.confirmed_at) : undefined,
          rewardClaimed: Boolean(existingAppRow.reward_claimed),
          pixelsRewarded: existingAppRow.pixels_rewarded || 10
        };
        saveLocalStorageApplications(effectiveUserId, [existingApp, ...localApps.filter(a => a.opportunityId !== String(opp.id))]);
        return existingApp;
      }
    }
    console.error('Failed to record application in Supabase:', insertError);
    throw new Error(insertError.message || 'Failed to record application in database.');
  }

  const newApp: UserApplication = {
    id: String(insertedData.id),
    userId: insertedData.user_id,
    opportunityId: insertedData.opportunity_id,
    opportunityTitle: insertedData.opportunity_title,
    organizer: insertedData.opportunity_organizer || insertedData.organizer || 'Official Host',
    category: insertedData.opportunity_category || insertedData.category || 'Opportunities',
    mode: insertedData.mode || 'Online',
    deadline: insertedData.deadline || 'Closing Soon',
    officialUrl: insertedData.official_url || '',
    appliedAt: parseEpochMs(insertedData.applied_at, insertedData.created_at),
    status: insertedData.status || 'pending_confirmation',
    rewardClaimed: false,
    pixelsRewarded: 0
  };

  saveLocalStorageApplications(effectiveUserId, [newApp, ...localApps.filter(a => a.opportunityId !== String(opp.id))]);
  return newApp;
};

/**
 * Confirm user registration after the 3-minute cooldown.
 * Allots +10 Pixels and records transaction.
 */
export const confirmOpportunityRegistration = async (
  userId: string,
  applicationId: string,
  userEmail?: string,
  userName?: string
): Promise<{ success: boolean; pixelsRewarded: number; message: string }> => {
  // Use active Supabase session user ID if available
  const { data: sessionData } = await supabase.auth.getSession();
  const currentAuthUser = sessionData?.session?.user;
  const targetUserId = currentAuthUser?.id || userId;

  if (!targetUserId) {
    return { success: false, pixelsRewarded: 0, message: 'You must be logged in to confirm registration.' };
  }

  const localApps = getLocalStorageApplications(targetUserId);
  let appIndex = localApps.findIndex(a => a.id === applicationId || a.opportunityId === applicationId);
  let app = appIndex !== -1 ? localApps[appIndex] : null;

  // If not found in local storage, query Supabase directly
  if (!app) {
    try {
      const { data: remoteApp } = await userAppsTable()
        .select('*')
        .eq('user_id', targetUserId)
        .or(`id.eq.${applicationId},opportunity_id.eq.${applicationId}`)
        .maybeSingle();

      if (remoteApp) {
        app = {
          id: String(remoteApp.id),
          userId: remoteApp.user_id,
          opportunityId: remoteApp.opportunity_id,
          opportunityTitle: remoteApp.opportunity_title,
          organizer: remoteApp.opportunity_organizer || remoteApp.organizer || '',
          category: remoteApp.opportunity_category || remoteApp.category || 'Opportunities',
          mode: remoteApp.mode || 'Online',
          deadline: remoteApp.deadline || '',
          officialUrl: remoteApp.official_url || '',
          appliedAt: parseEpochMs(remoteApp.applied_at, remoteApp.created_at),
          status: remoteApp.status || 'pending_confirmation',
          confirmedAt: remoteApp.confirmed_at ? parseEpochMs(remoteApp.confirmed_at) : undefined,
          rewardClaimed: Boolean(remoteApp.reward_claimed),
          pixelsRewarded: remoteApp.pixels_rewarded || 10
        };
      }
    } catch {
      // Ignore recovery error, handled below
    }
  }

  if (!app) {
    return { success: false, pixelsRewarded: 0, message: 'Application record not found' };
  }

  // Already confirmed in local record
  if (app.status === 'confirmed' && app.rewardClaimed) {
    return { success: true, pixelsRewarded: 0, message: 'Already confirmed and reward claimed' };
  }

  // Cooldown check (3 minutes)
  const timeElapsed = Date.now() - app.appliedAt;
  const THREE_MINUTES_MS = 3 * 60 * 1000;

  if (timeElapsed < THREE_MINUTES_MS) {
    const remainingSecs = Math.ceil((THREE_MINUTES_MS - timeElapsed) / 1000);
    const mins = Math.floor(remainingSecs / 60);
    const secs = remainingSecs % 60;
    return {
      success: false,
      pixelsRewarded: 0,
      message: `Registration is verifying. Please wait ${mins}m ${secs}s before confirming.`
    };
  }

  // Check remote database to ensure reward has not already been claimed from another session
  try {
    const { data: dbCheck } = await userAppsTable()
      .select('status, reward_claimed, applied_at')
      .eq('user_id', targetUserId)
      .eq('opportunity_id', app.opportunityId)
      .maybeSingle();

    if (dbCheck) {
      if (dbCheck.applied_at) {
        app.appliedAt = parseEpochMs(dbCheck.applied_at);
      }
      if (dbCheck.status === 'confirmed' || dbCheck.reward_claimed) {
        app.status = 'confirmed';
        app.rewardClaimed = true;
        if (appIndex !== -1) {
          localApps[appIndex] = app;
          saveLocalStorageApplications(targetUserId, localApps);
        }
        return { success: true, pixelsRewarded: 0, message: 'Already confirmed and reward claimed' };
      }
    }
  } catch (checkErr) {
    console.warn('[applications] DB pre-check note:', checkErr);
  }

  // Prepare updated state
  const rewardPixels = 10;
  const now = Date.now();
  const confirmedApp: UserApplication = {
    ...app,
    status: 'confirmed',
    confirmedAt: now,
    rewardClaimed: false,
    pixelsRewarded: 0
  };

  // 1. CONFIRM VIA SECURE RPC FIRST
  // The RPC verifies auth.uid(), application ownership, status = 'pending_confirmation',
  // and enforces that at least 180,000 ms have elapsed since original applied_at on the server.
  let confirmedTimestamp = now;
  try {
    const { data: confirmData, error: confirmErr } = await (supabase.rpc as any)('confirm_opportunity_registration', {
      p_opportunity_id: String(app.opportunityId)
    });

    if (confirmErr) {
      console.error('[applications] confirm_opportunity_registration RPC error:', confirmErr);
      return {
        success: false,
        pixelsRewarded: 0,
        message: confirmErr.message || 'Failed to confirm registration in database.'
      };
    }

    if (confirmData && confirmData.success === false) {
      return {
        success: false,
        pixelsRewarded: 0,
        message: confirmData.error || 'Failed to confirm registration.'
      };
    }

    if (confirmData?.confirmed_at) {
      confirmedTimestamp = Number(confirmData.confirmed_at);
    }
  } catch (err: any) {
    console.error('[applications] Exception in confirm_opportunity_registration RPC:', err);
    return {
      success: false,
      pixelsRewarded: 0,
      message: err?.message || 'Database confirmation error.'
    };
  }

  // 2. Award Pixels via secured claim_registration_pixels RPC
  // Confirmation and reward claiming are treated as separate steps.
  let isRewardClaimed = false;
  let actualRewardGranted = 0;
  let rewardMessage = 'Registration confirmed successfully.';

  try {
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)('claim_registration_pixels', {
      p_opportunity_id: String(app.opportunityId),
      p_opportunity_title: app.opportunityTitle,
      p_amount: rewardPixels
    });

    if (rpcErr) {
      console.warn('[applications] claim_registration_pixels RPC error:', rpcErr.message);
      rewardMessage = 'Registration confirmed, but reward claim encountered a temporary issue. You can retry claiming your Pixels.';
    } else if (rpcData && rpcData.already_claimed) {
      isRewardClaimed = true;
      actualRewardGranted = 0;
      rewardMessage = 'Registration confirmed (reward previously claimed).';
    } else if (rpcData && rpcData.success) {
      isRewardClaimed = true;
      actualRewardGranted = Number(rpcData.pixels_awarded ?? rpcData.pixelsRewarded ?? rewardPixels);
      rewardMessage = `Registration confirmed! +${actualRewardGranted} Pixels claimed.`;
    } else {
      console.warn('[applications] Unexpected response from claim_registration_pixels:', rpcData);
      rewardMessage = 'Registration confirmed. Please retry claiming your Pixels if not credited.';
    }
  } catch (err) {
    console.warn('[applications] Failed to claim registration pixels via RPC:', err);
    rewardMessage = 'Registration confirmed, but reward crediting was deferred. You can retry claiming.';
  }

  // 3. Persist local cache reflecting verified database state
  const finalizedApp: UserApplication = {
    ...confirmedApp,
    status: 'confirmed',
    confirmedAt: confirmedTimestamp,
    rewardClaimed: isRewardClaimed,
    pixelsRewarded: actualRewardGranted
  };

  if (appIndex !== -1) {
    localApps[appIndex] = finalizedApp;
    saveLocalStorageApplications(targetUserId, localApps);
  } else {
    saveLocalStorageApplications(targetUserId, [finalizedApp, ...localApps]);
  }

  // 4. Trigger registration confirmation email
  const recipient = userEmail || currentAuthUser?.email;
  if (recipient && recipient.includes('@')) {
    sendRegistrationConfirmationEmail({
      recipientEmail: recipient,
      recipientName: userName || currentAuthUser?.user_metadata?.full_name || currentAuthUser?.user_metadata?.name,
      opportunityTitle: app.opportunityTitle,
      opportunityId: app.opportunityId,
      organizer: app.organizer,
      category: app.category,
      mode: app.mode,
      deadline: app.deadline,
      officialUrl: app.officialUrl
    }).then((res) => {
      if (res.success) {
        console.log('[applications] Registration confirmation email dispatched successfully.');
      } else {
        console.warn('[applications] Registration confirmation email dispatch note:', res.error);
      }
    }).catch((emailErr) => {
      console.warn('[applications] Email confirmation dispatch error:', emailErr);
    });
  }

  return {
    success: true,
    pixelsRewarded: actualRewardGranted,
    message: rewardMessage
  };
};

