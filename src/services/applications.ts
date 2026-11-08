import { supabase } from '../lib/supabase';
import { adjustUserPixels } from './admin';
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
    const { data, error } = await supabase
      .from('user_applications')
      .select('*')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const remoteApps: UserApplication[] = data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        opportunityId: row.opportunity_id,
        opportunityTitle: row.opportunity_title,
        organizer: row.organizer || '',
        category: row.category || 'Opportunities',
        mode: row.mode || 'Online',
        deadline: row.deadline || '',
        officialUrl: row.official_url || '',
        appliedAt: new Date(row.applied_at || row.created_at).getTime(),
        status: row.status || 'pending_confirmation',
        confirmedAt: row.confirmed_at ? new Date(row.confirmed_at).getTime() : undefined,
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
  const localApps = getLocalStorageApplications(userId);
  const existing = localApps.find(a => String(a.opportunityId) === String(opp.id));

  if (existing) {
    return existing;
  }

  const newApp: UserApplication = {
    id: `app_${userId}_${opp.id}`,
    userId,
    opportunityId: String(opp.id),
    opportunityTitle: opp.title,
    organizer: opp.organizer || 'Official Host',
    category: opp.category || 'Opportunities',
    mode: opp.mode || 'Online',
    deadline: opp.deadline || 'Closing Soon',
    officialUrl: opp.officialUrl || '',
    appliedAt: Date.now(),
    status: 'pending_confirmation',
    rewardClaimed: false,
    pixelsRewarded: 10
  };

  const updated = [newApp, ...localApps];
  saveLocalStorageApplications(userId, updated);

  // Sync to Supabase in background
  try {
    await (supabase.from('user_applications' as any) as any).upsert({
      id: newApp.id,
      user_id: userId,
      opportunity_id: newApp.opportunityId,
      opportunity_title: newApp.opportunityTitle,
      organizer: newApp.organizer,
      category: newApp.category,
      mode: newApp.mode,
      deadline: newApp.deadline,
      official_url: newApp.officialUrl,
      applied_at: new Date(newApp.appliedAt).toISOString(),
      status: 'pending_confirmation',
      reward_claimed: false,
      pixels_rewarded: 10
    }, { onConflict: 'user_id,opportunity_id' });
  } catch (err) {
    console.warn('Could not sync application to Supabase:', err);
  }

  return newApp;
};

/**
 * Confirm user registration after the 3-minute cooldown.
 * Allots +10 Pixels and records transaction.
 */
export const confirmOpportunityRegistration = async (
  userId: string,
  applicationId: string,
  userEmail?: string
): Promise<{ success: boolean; pixelsRewarded: number; message: string }> => {
  const localApps = getLocalStorageApplications(userId);
  const appIndex = localApps.findIndex(a => a.id === applicationId);

  if (appIndex === -1) {
    return { success: false, pixelsRewarded: 0, message: 'Application record not found' };
  }

  const app = localApps[appIndex];

  if (app.status === 'confirmed' && app.rewardClaimed) {
    return { success: true, pixelsRewarded: 0, message: 'Already confirmed and reward claimed' };
  }

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

  // Update application state
  const rewardPixels = 10;
  const updatedApp: UserApplication = {
    ...app,
    status: 'confirmed',
    confirmedAt: Date.now(),
    rewardClaimed: true,
    pixelsRewarded: rewardPixels
  };

  localApps[appIndex] = updatedApp;
  saveLocalStorageApplications(userId, localApps);

  // Sync to Supabase
  let dbSynced = false;
  try {
    const { error: syncError } = await (supabase.from('user_applications' as any) as any).upsert({
      id: updatedApp.id,
      user_id: userId,
      opportunity_id: updatedApp.opportunityId,
      opportunity_title: updatedApp.opportunityTitle,
      status: 'confirmed',
      confirmed_at: new Date(updatedApp.confirmedAt!).toISOString(),
      reward_claimed: true,
      pixels_rewarded: rewardPixels
    }, { onConflict: 'user_id,opportunity_id' });

    if (!syncError) {
      dbSynced = true;
    } else {
      console.warn('Could not sync confirmed status to Supabase:', syncError);
    }
  } catch (err) {
    console.warn('Could not sync confirmed status to Supabase:', err);
  }

  // Allot Pixels to user
  try {
    await adjustUserPixels(
      { uid: 'system', email: userEmail || 'system@pixelminds.org' },
      userId,
      rewardPixels,
      `Registered for ${app.opportunityTitle}`
    );
  } catch (err) {
    console.warn('Failed to adjust user pixels via service:', err);
  }

  // Send registration confirmation email ONLY after successful registration sync (deduplication prevents repeats)
  if (userEmail && userEmail.includes('@') && dbSynced) {
    sendRegistrationConfirmationEmail({
      recipientEmail: userEmail,
      opportunityTitle: app.opportunityTitle,
      opportunityId: app.opportunityId,
      organizer: app.organizer,
      category: app.category,
      mode: app.mode,
      deadline: app.deadline,
      officialUrl: app.officialUrl
    }).catch((emailErr) => {
      console.warn('[applications] Email confirmation dispatch note:', emailErr);
    });
  }

  return {
    success: true,
    pixelsRewarded: rewardPixels,
    message: `Registration confirmed! +${rewardPixels} Pixels added to your balance.`
  };
};

