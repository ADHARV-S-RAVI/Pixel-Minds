import { supabase } from '../lib/supabase';
import type { Opportunity, OpportunityStatus } from '../types';
import type { Database } from '../types/database';

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
  updatedAt: new Date(row.updated_at).getTime()
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
  if (data.status !== undefined) row.status = data.status;
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

  const opportunities = (data || []).map(mapRow);

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
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch opportunity by ID:', error.message);
    return null;
  }

  return data ? mapRow(data) : null;
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
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData?.user;

  const actualUserId = authUser?.id || userId;

  if (!actualUserId || actualUserId === 'anonymous-user') {
    throw new Error('You must be signed in to submit an opportunity. Please sign in and try again.');
  }

  const payload = {
    user_id: actualUserId,
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
    eligibility: data.eligibility || '',
    team_size: data.teamSize || '',
    skills: data.skills || [],
    image_url: data.imageUrl || '',
    official_url: data.officialUrl || '',
    additional_info: data.additionalInfo || '',
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

// ==========================================================================
// ADMIN OPERATIONS
// ==========================================================================

/**
 * Admin: Fetch all pending submissions for the review queue.
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

  return (data || []).map(mapSubmissionRow);
};

/**
 * Admin: Fetch ALL opportunities (all statuses) for the admin CMS.
 */
export const getAllOpportunities = async () => {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch all opportunities:', error.message);
    return [];
  }

  return (data || []).map(mapRow);
};

/**
 * Admin: Update an existing opportunity or approve/reject a pending submission.
 */
export const updateOpportunityAdmin = async (id: string, updates: Partial<Opportunity>) => {
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

      const { data: createdOpp, error: oppErr } = await supabase
        .from('opportunities')
        .insert(oppPayload)
        .select()
        .single();

      if (oppErr) {
        console.error('Failed to create opportunity from submission:', oppErr.message);
        throw new Error('Failed to approve submission: ' + oppErr.message);
      }

      // Mark submission as approved and link opportunity_id
      await supabase
        .from('submissions')
        .update({
          status: 'approved',
          opportunity_id: createdOpp.id
        })
        .eq('id', id);

      return;
    } else if (updates.status === 'rejected') {
      const { error: rejectErr } = await supabase
        .from('submissions')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (rejectErr) {
        console.error('Failed to reject submission:', rejectErr.message);
        throw new Error('Failed to reject submission: ' + rejectErr.message);
      }
      return;
    }
  }

  // 2. Otherwise, update the opportunity directly in public.opportunities
  const payload = toUpdatePayload(updates);

  const { error } = await supabase
    .from('opportunities')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('Failed to update opportunity:', error.message);
    throw new Error('Failed to update opportunity: ' + error.message);
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
    status: data.status || 'published',
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

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    // If it is a non-UUID mock/demo item, return cleanly
    return;
  }

  // 1. Delete from public.opportunities
  const { error: oppError } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id);

  if (oppError) {
    console.error('[deleteOpportunityAdmin] Error deleting from opportunities:', oppError.message);
    throw new Error(`Failed to delete opportunity: ${oppError.message}`);
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

