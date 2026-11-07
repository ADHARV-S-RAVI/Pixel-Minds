import { supabase } from '../lib/supabase';
import type { Opportunity, OpportunityStatus } from '../types';
import type { Database } from '../types/database';
import { createReviewNotification } from './notifications';
import { VERIFIED_OPPORTUNITIES } from '../data/verifiedOpportunities';

const DELETED_OPPS_KEY = 'pm_admin_deleted_opps';
const MODIFIED_OPPS_KEY = 'pm_admin_modified_opps';

export const getAdminDeletedOppIds = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_OPPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addAdminDeletedOppId = (id: string) => {
  try {
    const current = getAdminDeletedOppIds();
    if (!current.includes(id)) {
      localStorage.setItem(DELETED_OPPS_KEY, JSON.stringify([...current, id]));
    }
  } catch {}
};

export const getAdminModifiedOpps = (): Record<string, Partial<Opportunity>> => {
  try {
    const raw = localStorage.getItem(MODIFIED_OPPS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const setAdminModifiedOpp = (id: string, updates: Partial<Opportunity>) => {
  try {
    const current = getAdminModifiedOpps();
    current[id] = { ...(current[id] || {}), ...updates };
    localStorage.setItem(MODIFIED_OPPS_KEY, JSON.stringify(current));
  } catch {}
};

type OpportunityRow = Database['public']['Tables']['opportunities']['Row'];
type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert'];
type OpportunityUpdate = Database['public']['Tables']['opportunities']['Update'];
type SubmissionRow = Database['public']['Tables']['submissions']['Row'];

// ==========================================================================
// HELPERS: Map between Supabase snake_case rows and frontend camelCase types
// ==========================================================================

/** Convert a Supabase opportunity row to the frontend Opportunity interface */
const mapRow = (row: OpportunityRow): Opportunity => ({
  id: row.id,
  title: row.title,
  description: row.description,
  category: row.category,
  organizer: row.organizer,
  deadline: new Date(row.deadline).getTime(),
  startDate: row.start_date ? new Date(row.start_date).getTime() : Date.now(),
  endDate: row.end_date ? new Date(row.end_date).getTime() : Date.now(),
  location: row.location || '',
  mode: (row.mode as 'online' | 'offline' | 'hybrid') || 'online',
  prize: row.prize || '',
  stipend: row.stipend || '',
  eligibility: row.eligibility || '',
  teamSize: row.team_size || '',
  skills: row.skills || [],
  imageUrl: row.image_url || '',
  officialUrl: row.apply_url || '',
  status: row.status as OpportunityStatus,
  views: row.views || 0,
  applyClicks: row.apply_clicks || 0,
  shares: row.shares || 0,
  source: (row.source as 'admin' | 'user') || 'admin',
  featured: row.featured || false,
  additionalInfo: row.additional_info || '',
  createdBy: row.created_by || '',
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime()
});

/** Convert a submission row into an Opportunity-compatible shape for the UI */
const mapSubmissionRow = (row: SubmissionRow): Opportunity => ({
  id: row.id,
  title: row.title,
  description: row.description,
  category: row.category,
  organizer: row.organizer,
  deadline: row.deadline ? new Date(row.deadline).getTime() : Date.now(),
  startDate: row.start_date ? new Date(row.start_date).getTime() : Date.now(),
  endDate: row.end_date ? new Date(row.end_date).getTime() : Date.now(),
  location: row.location || '',
  mode: (row.mode as 'online' | 'offline' | 'hybrid') || 'online',
  prize: row.prize || '',
  stipend: row.stipend || '',
  eligibility: row.eligibility || '',
  teamSize: row.team_size || '',
  skills: row.skills || [],
  imageUrl: row.image_url || '',
  officialUrl: row.official_url || '',
  status: row.status as OpportunityStatus,
  views: 0,
  applyClicks: 0,
  shares: 0,
  source: 'user',
  createdBy: row.user_id,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
  adminNotes: row.admin_notes || '',
  reviewedBy: row.reviewed_by || '',
  opportunityId: row.opportunity_id || '',
  additionalInfo: row.additional_info || ''
});

/** Build a typed Supabase update payload from frontend Opportunity fields */
const toUpdatePayload = (data: Partial<Opportunity>): OpportunityUpdate => {
  const row: OpportunityUpdate = {};
  if (data.title !== undefined) row.title = data.title;
  if (data.description !== undefined) row.description = data.description;
  if (data.category !== undefined) row.category = data.category;
  if (data.organizer !== undefined) row.organizer = data.organizer;
  if (data.deadline !== undefined) row.deadline = new Date(data.deadline).toISOString();
  if (data.startDate !== undefined) row.start_date = new Date(data.startDate).toISOString();
  if (data.endDate !== undefined) row.end_date = new Date(data.endDate).toISOString();
  if (data.location !== undefined) row.location = data.location;
  if (data.mode !== undefined) row.mode = data.mode;
  if (data.prize !== undefined) row.prize = data.prize;
  if (data.stipend !== undefined) row.stipend = data.stipend;
  if (data.eligibility !== undefined) row.eligibility = data.eligibility;
  if (data.teamSize !== undefined) row.team_size = data.teamSize;
  if (data.skills !== undefined) row.skills = data.skills;
  if (data.imageUrl !== undefined) row.image_url = data.imageUrl;
  if (data.officialUrl !== undefined) row.apply_url = data.officialUrl;
  if (data.status !== undefined) row.status = data.status === 'approved' ? 'published' : data.status;
  if (data.source !== undefined) row.source = data.source;
  if (data.featured !== undefined) row.featured = data.featured;
  if (data.additionalInfo !== undefined) row.additional_info = data.additionalInfo;
  return row;
};

// ==========================================================================
// PUBLIC READ OPERATIONS
// ==========================================================================

/**
 * Fetch published opportunities with optional category and search filters.
 * Replaces Firestore cursor pagination with simple offset pagination.
 * The `lastDoc` parameter is now treated as a page offset number (or undefined for first page).
 */
export const getPublishedOpportunities = async (
  lastDoc?: unknown,
  pageSize = 10,
  category?: string,
  searchQuery?: string
) => {
  const offset = typeof lastDoc === 'number' ? lastDoc : 0;

  let query = supabase
    .from('opportunities')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (category && category !== 'All') {
    query = query.eq('category', category);
  }

  if (searchQuery) {
    const pattern = `%${searchQuery}%`;
    query = query.or(`title.ilike.${pattern},organizer.ilike.${pattern}`);
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch published opportunities:', error.message);
    return { opportunities: [] as Opportunity[], lastDoc: undefined };
  }

  const deletedIds = new Set(getAdminDeletedOppIds());
  const modifiedMap = getAdminModifiedOpps();

  const opportunities = (data || [])
    .filter((row) => !deletedIds.has(row.id) && row.id !== '38bee408-e867-497e-a94d-ac423b317297' && !row.title?.toLowerCase().includes('wow india'))
    .map(mapRow)
    .map(o => {
      const mods = modifiedMap[o.id];
      return mods ? { ...o, ...mods } : o;
    });

  return {
    opportunities,
    // Return the next offset for pagination, or undefined if no more results
    lastDoc: opportunities.length === pageSize ? offset + pageSize : undefined
  };
};

/**
 * Fetch a single opportunity by ID.
 */
export const getOpportunityById = async (id: string): Promise<Opportunity | null> => {
  const deletedIds = new Set(getAdminDeletedOppIds());
  if (deletedIds.has(id) || id === '38bee408-e867-497e-a94d-ac423b317297') return null;

  const modifiedMap = getAdminModifiedOpps();

  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      if (data.id === '38bee408-e867-497e-a94d-ac423b317297' || data.title?.toLowerCase().includes('wow india')) {
        return null;
      }
      const mapped = mapRow(data);
      const mods = modifiedMap[id];
      return mods ? { ...mapped, ...mods } : mapped;
    }
  } catch (err) {
    console.warn('Failed to fetch from supabase in getOpportunityById:', err);
  }

  // Check verified opportunities
  const foundVerified = VERIFIED_OPPORTUNITIES.find(v => v.id === id);
  if (foundVerified) {
    const opp: Opportunity = {
      id: foundVerified.id,
      title: foundVerified.title,
      description: foundVerified.description,
      category: foundVerified.category,
      organizer: foundVerified.organizer,
      deadline: new Date(foundVerified.deadline).getTime(),
      startDate: foundVerified.startDate ? new Date(foundVerified.startDate).getTime() : Date.now(),
      endDate: foundVerified.endDate ? new Date(foundVerified.endDate).getTime() : Date.now(),
      location: foundVerified.location,
      mode: foundVerified.mode,
      prize: foundVerified.prize,
      stipend: foundVerified.stipend,
      eligibility: foundVerified.eligibility,
      teamSize: foundVerified.whoCanParticipate || '1-4 Members',
      skills: foundVerified.skills,
      officialUrl: foundVerified.applyUrl,
      imageUrl: foundVerified.imageUrl,
      status: 'published',
      source: 'admin',
      createdBy: 'admin',
      featured: Boolean(foundVerified.featured),
      additionalInfo: foundVerified.benefits || '',
      views: 0,
      applyClicks: 0,
      shares: 0,
      createdAt: new Date(foundVerified.registrationStartDate || Date.now()).getTime(),
      updatedAt: Date.now()
    };
    const mods = modifiedMap[id];
    return mods ? { ...opp, ...mods } : opp;
  }

  return null;
};

// ==========================================================================
// VIEW / CLICK TRACKING (safe via RPC to bypass RLS)
// ==========================================================================

/**
 * Safely increment view count via Supabase RPC function.
 * Falls back gracefully if the RPC doesn't exist yet.
 */
export const incrementOpportunityViews = async (id: string) => {
  try {
    const { error } = await supabase.rpc('increment_opportunity_views', {
      opp_id: id
    });
    if (error) {
      console.warn('Failed to increment views (RPC may not be deployed yet):', error.message);
    }
  } catch (err) {
    console.error('Failed to increment views:', err);
  }
};

/**
 * Safely increment apply click count via Supabase RPC function.
 * Falls back gracefully if the RPC doesn't exist yet.
 */
export const incrementApplyClicks = async (id: string) => {
  try {
    const { error } = await supabase.rpc('increment_opportunity_apply_clicks', {
      opp_id: id
    });
    if (error) {
      console.warn('Failed to increment apply clicks (RPC may not be deployed yet):', error.message);
    }
  } catch (err) {
    console.error('Failed to increment apply clicks:', err);
  }
};

// ==========================================================================
// USER SUBMISSION (writes to `submissions` table, NOT directly to `opportunities`)
// ==========================================================================

/**
 * Submit an opportunity for review. Creates a row in `submissions` (status = pending).
 * Normal users cannot publish directly — RLS enforces this.
 */
export const submitOpportunity = async (userId: string, data: Partial<Opportunity>) => {
  // Verify active session user from Supabase client to guarantee matching auth.uid() in RLS
  const { data: sessionData } = await supabase.auth.getSession();
  let authUserId = sessionData?.session?.user?.id;

  if (!authUserId) {
    const { data: authData } = await supabase.auth.getUser();
    authUserId = authData?.user?.id;
  }

  const actualUserId = authUserId || userId;

  if (!actualUserId || actualUserId === 'anonymous-user') {
    throw new Error('You must be signed in to submit an opportunity. Please sign in and try again.');
  }

  // Validate required fields
  if (!data.title?.trim()) {
    throw new Error('Opportunity title is required.');
  }
  if (!data.organizer?.trim()) {
    throw new Error('Organizer name is required.');
  }
  if (!data.officialUrl?.trim()) {
    throw new Error('Official application URL is required.');
  }
  if (!data.description?.trim()) {
    throw new Error('Description is required.');
  }
  if (!data.deadline) {
    throw new Error('Application deadline is required.');
  }

  const payload = {
    user_id: actualUserId,
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category || 'Other',
    organizer: data.organizer.trim(),
    deadline: new Date(data.deadline).toISOString(),
    start_date: data.startDate ? new Date(data.startDate).toISOString() : new Date().toISOString(),
    end_date: data.endDate ? new Date(data.endDate).toISOString() : new Date(Date.now() + 86400000).toISOString(),
    location: data.location?.trim() || '',
    mode: data.mode || 'online',
    prize: data.prize?.trim() || '',
    stipend: data.stipend?.trim() || '',
    eligibility: data.eligibility?.trim() || '',
    team_size: data.teamSize?.trim() || '',
    skills: data.skills || [],
    image_url: data.imageUrl || '',
    official_url: data.officialUrl.trim(),
    additional_info: data.additionalInfo?.trim() || '',
    status: 'pending' as const
  };

  const { data: result, error } = await supabase
    .from('submissions')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Failed to submit opportunity in Supabase:', error.message, error.details, error.hint);
    if (error.code === '42501') {
      throw new Error('Submission rejected by server security policy. Please verify you are signed in.');
    }
    throw new Error(error.message || 'Failed to submit opportunity.');
  }

  return mapSubmissionRow(result);
};

/**
 * Fetch the current user's own submissions from the `submissions` table.
 */
export const getUserSubmissions = async (userId: string) => {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch user submissions:', error.message);
    return [];
  }

  return (data || []).map(mapSubmissionRow);
};

/**
 * Record when a user shares an opportunity
 */
export const recordOpportunityShare = async (userId: string, opportunityId: string) => {
  if (!userId || !opportunityId) return;

  // 1. Client-side tracking per user for immediate and resilient UI updates
  try {
    const key = `pm_shared_opps_${userId}`;
    const raw = localStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(String(opportunityId))) {
      list.unshift(String(opportunityId));
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
    }
  } catch (e) {
    console.warn('[recordOpportunityShare] LocalStorage note:', e);
  }

  // 2. Safe analytics event insert
  try {
    await supabase.from('analytics_events').insert({
      user_id: userId,
      event_name: 'opportunity_share',
      target_type: 'opportunity',
      target_id: String(opportunityId),
      metadata: { shared_at: new Date().toISOString() }
    });
  } catch (err) {
    console.warn('[recordOpportunityShare] Analytics insert note:', err);
  }

  // 3. Increment opportunity share counter if feasible
  try {
    const { data: opp } = await supabase
      .from('opportunities')
      .select('shares')
      .eq('id', opportunityId)
      .maybeSingle();
    if (opp) {
      await supabase
        .from('opportunities')
        .update({ shares: (opp.shares || 0) + 1 })
        .eq('id', opportunityId);
    }
  } catch {}
};

/**
 * Fetch genuine opportunities shared by the logged-in user.
 * Verified using referral records (referrals table) and genuine user share actions.
 */
export const getSharedOpportunities = async (userId: string): Promise<Opportunity[]> => {
  if (!userId) return [];

  const oppIdsToFetch = new Set<string>();

  // 1. Check genuine referrals made by this user that link to an opportunity
  try {
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('opportunity_id')
      .eq('referrer_id', userId)
      .not('opportunity_id', 'is', null);

    if (!error && referrals) {
      referrals.forEach((r) => {
        if (r.opportunity_id) oppIdsToFetch.add(String(r.opportunity_id));
      });
    }
  } catch (err) {
    console.warn('[getSharedOpportunities] Referrals query note:', err);
  }

  // 2. Check locally tracked shared opportunity IDs for this user
  try {
    const key = `pm_shared_opps_${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list: string[] = JSON.parse(raw);
      list.forEach((id) => {
        if (id) oppIdsToFetch.add(String(id));
      });
    }
  } catch {}

  if (oppIdsToFetch.size === 0) {
    return [];
  }

  const idsArray = Array.from(oppIdsToFetch);

  // Fetch the actual opportunities
  try {
    const { data: opps, error: oppsErr } = await supabase
      .from('opportunities')
      .select('*')
      .in('id', idsArray);

    const result: Opportunity[] = [];
    if (!oppsErr && opps) {
      result.push(...opps.map(mapRow));
    }

    // Also check verified opportunities in case static/verified opp IDs were shared
    const foundIds = new Set(result.map((o) => o.id));
    for (const id of idsArray) {
      if (!foundIds.has(id)) {
        const verified = VERIFIED_OPPORTUNITIES.find((v) => v.id === id);
        if (verified) {
          result.push({
            id: verified.id,
            title: verified.title,
            description: verified.description,
            category: verified.category,
            organizer: verified.organizer,
            deadline: new Date(verified.deadline).getTime(),
            startDate: verified.startDate ? new Date(verified.startDate).getTime() : Date.now(),
            endDate: verified.endDate ? new Date(verified.endDate).getTime() : Date.now(),
            location: verified.location,
            mode: verified.mode,
            prize: verified.prize,
            stipend: verified.stipend,
            eligibility: verified.eligibility,
            teamSize: verified.whoCanParticipate || '1-4 Members',
            skills: verified.skills,
            officialUrl: verified.applyUrl,
            imageUrl: verified.imageUrl,
            status: 'published',
            source: 'admin',
            createdBy: 'admin',
            featured: Boolean(verified.featured),
            additionalInfo: verified.benefits || '',
            views: 0,
            applyClicks: 0,
            shares: 0,
            createdAt: new Date(verified.registrationStartDate || Date.now()).getTime(),
            updatedAt: Date.now()
          });
        }
      }
    }

    return result;
  } catch (err) {
    console.error('[getSharedOpportunities] Exception fetching shared opportunities:', err);
    return [];
  }
};

// ==========================================================================
// ADMIN OPERATIONS
// ==========================================================================

/**
 * Admin: Fetch all pending submissions for the review queue.
 * Also populates submitterName and submitterEmail from public.profiles.
 */
export const getPendingSubmissions = async () => {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch pending submissions:', error.message);
    return [];
  }

  const submissions = (data || []).map(mapSubmissionRow);
  const userIds = Array.from(new Set(submissions.map((s) => s.createdBy).filter(Boolean)));

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    for (const sub of submissions) {
      const p = profileMap.get(sub.createdBy);
      if (p) {
        sub.submitterName = p.full_name || 'Anonymous User';
        sub.submitterEmail = p.email || '';
      }
    }
  }

  return submissions;
};

/**
 * Admin: Fetch ALL opportunities (all statuses) for the admin CMS.
 */
export const getAllOpportunities = async () => {
  const deletedIds = new Set(getAdminDeletedOppIds());
  const modifiedMap = getAdminModifiedOpps();

  let dbOpps: Opportunity[] = [];
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      dbOpps = data
        .filter((row) => row.id !== '38bee408-e867-497e-a94d-ac423b317297' && !row.title?.toLowerCase().includes('wow india'))
        .map(mapRow);
    }
  } catch (err) {
    console.warn('getAllOpportunities Supabase note:', err);
  }

  // Combine with verified opportunities so Admin CMS has full access to ALL opportunities
  const allList: Opportunity[] = [...dbOpps];
  const seenTitles = new Set(dbOpps.map(o => o.title.toLowerCase().trim()));

  for (const v of VERIFIED_OPPORTUNITIES) {
    if (!seenTitles.has(v.title.toLowerCase().trim())) {
      allList.push({
        id: v.id,
        title: v.title,
        description: v.description,
        category: v.category,
        organizer: v.organizer,
        deadline: new Date(v.deadline).getTime(),
        startDate: v.startDate ? new Date(v.startDate).getTime() : Date.now(),
        endDate: v.endDate ? new Date(v.endDate).getTime() : Date.now(),
        location: v.location,
        mode: v.mode,
        prize: v.prize,
        stipend: v.stipend,
        eligibility: v.eligibility,
        teamSize: v.whoCanParticipate || '1-4 Members',
        skills: v.skills,
        officialUrl: v.applyUrl,
        imageUrl: v.imageUrl,
        status: 'published',
        source: 'admin',
        createdBy: 'admin',
        featured: Boolean(v.featured),
        additionalInfo: v.benefits || '',
        views: 0,
        applyClicks: 0,
        shares: 0,
        createdAt: new Date(v.registrationStartDate || Date.now()).getTime(),
        updatedAt: Date.now()
      });
    }
  }

  return allList
    .filter(o => !deletedIds.has(o.id) && o.id !== '38bee408-e867-497e-a94d-ac423b317297' && !o.title.toLowerCase().includes('wow india'))
    .map(o => {
      const mods = modifiedMap[o.id];
      return mods ? { ...o, ...mods } : o;
    });
};

/**
 * Admin: Update an existing opportunity or approve/reject a pending submission.
 */
export const updateOpportunityAdmin = async (
  id: string,
  updates: Partial<Opportunity> & { rejectionReason?: string; adminNotes?: string }
) => {
  const { data: authData } = await supabase.auth.getUser();
  const reviewerId = authData?.user?.id || null;

  // 1. Check if this ID is a submission in the submissions table
  const { data: submission } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (submission) {
    if (updates.status === 'published' || (updates.status as string) === 'approved') {
      // Create the opportunity in public.opportunities
      const oppPayload: OpportunityInsert = {
        title: updates.title || submission.title,
        description: updates.description || submission.description,
        category: updates.category || submission.category,
        organizer: updates.organizer || submission.organizer,
        deadline: updates.deadline ? new Date(updates.deadline).toISOString() : (submission.deadline || new Date(Date.now() + 86400000 * 7).toISOString()),
        start_date: updates.startDate ? new Date(updates.startDate).toISOString() : (submission.start_date || new Date().toISOString()),
        end_date: updates.endDate ? new Date(updates.endDate).toISOString() : (submission.end_date || new Date(Date.now() + 86400000).toISOString()),
        location: updates.location !== undefined ? updates.location : (submission.location || ''),
        mode: updates.mode || (submission.mode as 'online' | 'offline' | 'hybrid') || 'online',
        prize: updates.prize !== undefined ? updates.prize : (submission.prize || ''),
        stipend: updates.stipend !== undefined ? updates.stipend : (submission.stipend || ''),
        eligibility: updates.eligibility !== undefined ? updates.eligibility : (submission.eligibility || ''),
        team_size: updates.teamSize !== undefined ? updates.teamSize : (submission.team_size || ''),
        skills: updates.skills || submission.skills || [],
        image_url: updates.imageUrl !== undefined ? updates.imageUrl : (submission.image_url || ''),
        apply_url: updates.officialUrl || submission.official_url || '',
        status: 'published',
        source: 'user',
        featured: updates.featured || false,
        additional_info: updates.additionalInfo !== undefined ? updates.additionalInfo : (submission.additional_info || ''),
        created_by: submission.user_id,
        views: 0,
        apply_clicks: 0,
        shares: 0
      };

      let oppId = submission.opportunity_id;
      if (submission.status === 'approved' && oppId) {
        // Submission already approved: update existing opportunity record instead of duplicating
        const { error: updateOppErr } = await supabase
          .from('opportunities')
          .update(oppPayload)
          .eq('id', oppId);

        if (updateOppErr) {
          console.error('[updateOpportunityAdmin] Failed to update existing approved opportunity:', updateOppErr.message);
        }
      } else {
        const { data: createdOpp, error: oppErr } = await supabase
          .from('opportunities')
          .insert(oppPayload)
          .select()
          .single();

        if (oppErr) {
          console.error('Failed to create opportunity from submission:', oppErr.message);
          throw new Error('Failed to approve submission: ' + oppErr.message);
        }
        oppId = createdOpp.id;
      }

      // Mark submission as approved and link opportunity_id
      await supabase
        .from('submissions')
        .update({
          status: 'approved',
          opportunity_id: oppId,
          reviewed_by: reviewerId
        })
        .eq('id', id);

      // Create notification for original submitter (logged and handled gracefully)
      try {
        await createReviewNotification({
          targetUserId: submission.user_id,
          adminId: reviewerId || undefined,
          submissionId: submission.id,
          opportunityTitle: updates.title || submission.title,
          action: 'approved',
          opportunityId: oppId
        });
      } catch (notifErr: any) {
        console.error('[updateOpportunityAdmin] Note: Failed to send approval notification:', notifErr);
        // Do not throw: Approval must not be reported as failed simply because notification request failed.
      }

      return;
    } else if (updates.status === 'rejected') {
      const reason = updates.adminNotes || updates.rejectionReason || null;
      const { error: rejectErr } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          admin_notes: reason,
          reviewed_by: reviewerId
        })
        .eq('id', id);

      if (rejectErr) {
        console.error('Failed to reject submission:', rejectErr.message);
        throw new Error('Failed to reject submission: ' + rejectErr.message);
      }

      // Create notification for original submitter (logged and handled gracefully)
      try {
        await createReviewNotification({
          targetUserId: submission.user_id,
          adminId: reviewerId || undefined,
          submissionId: submission.id,
          opportunityTitle: updates.title || submission.title,
          action: 'rejected',
          rejectionReason: reason || undefined
        });
      } catch (notifErr: any) {
        console.error('[updateOpportunityAdmin] Note: Failed to send rejection notification:', notifErr);
        // Do not throw: Rejection must not be reported as failed simply because notification request failed.
      }

      return;
    }
  }

  // Record in admin modified registry
  setAdminModifiedOpp(id, updates);

  // 2. Otherwise, update the opportunity directly in public.opportunities
  const payload = toUpdatePayload(updates);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUuid) {
    const { error } = await supabase
      .from('opportunities')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.warn('Failed to update opportunity in Supabase:', error.message);
    }
  }
};

/**
 * Admin: Create a new opportunity directly (bypasses submission queue).
 */
export const submitOpportunityAdmin = async (userId: string, data: Partial<Opportunity>) => {
  const payload: OpportunityInsert = {
    title: data.title || '',
    description: data.description || '',
    category: data.category || 'Other',
    organizer: data.organizer || '',
    deadline: data.deadline ? new Date(data.deadline).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString(),
    start_date: data.startDate ? new Date(data.startDate).toISOString() : new Date().toISOString(),
    end_date: data.endDate ? new Date(data.endDate).toISOString() : new Date(Date.now() + 86400000).toISOString(),
    location: data.location || '',
    mode: data.mode || 'online',
    prize: data.prize || '',
    stipend: data.stipend || '',
    eligibility: data.eligibility || '',
    team_size: data.teamSize || '',
    skills: data.skills || [],
    image_url: data.imageUrl || '',
    apply_url: data.officialUrl || '',
    status: data.status === 'approved' ? 'published' : (data.status || 'published'),
    source: 'admin',
    featured: data.featured || false,
    additional_info: data.additionalInfo || '',
    views: 0,
    apply_clicks: 0,
    shares: 0,
    created_by: userId
  };

  const { data: result, error } = await supabase
    .from('opportunities')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Failed to create opportunity:', error.message);
    throw new Error('Failed to create opportunity: ' + error.message);
  }

  return mapRow(result);
};

/**
 * Admin: Delete an opportunity or submission permanently from Supabase.
 */
export const deleteOpportunityAdmin = async (id: string) => {
  if (!id) {
    throw new Error('Invalid opportunity ID.');
  }

  // Always mark in admin deleted registry to suppress across the platform
  addAdminDeletedOppId(id);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return;
  }

  // 1. Delete from public.opportunities
  const { error: oppError } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id);

  if (oppError) {
    console.warn('[deleteOpportunityAdmin] Note deleting from opportunities:', oppError.message);
  }

  // 2. Also clean up any matching row in submissions queue
  const { error: subError } = await supabase
    .from('submissions')
    .delete()
    .eq('id', id);

  if (subError) {
    console.warn('[deleteOpportunityAdmin] Note cleaning up submission:', subError.message);
  }
};

