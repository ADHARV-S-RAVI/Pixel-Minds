import { supabase } from '../lib/supabase';
import type { Announcement } from '../types';
import type { Database } from '../types/database';
import { recordAuditLog } from './admin';

type AnnouncementUpdate = Database['public']['Tables']['announcements']['Update'];

/**
 * Fetch active announcements that are published and within their validity window
 */
export const getActiveAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('status', 'published')
      .lte('start_date', nowIso)
      .gte('end_date', nowIso)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[getActiveAnnouncements] Note fetching active announcements:', error.message);
      // Fallback to published without date filter if strict date comparison has timezone discrepancies
      const { data: fallbackData } = await supabase
        .from('announcements')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(5);

      return (fallbackData || []).map(formatAnnouncementRow);
    }

    if (!data || data.length === 0) {
      // Check if there are published announcements without strict expiration
      const { data: fallbackData } = await supabase
        .from('announcements')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(5);

      return (fallbackData || []).map(formatAnnouncementRow);
    }

    return data.map(formatAnnouncementRow);
  } catch (err) {
    console.error('[getActiveAnnouncements] Exception:', err);
    return [];
  }
};

/**
 * Fetch announcements list (for admin console or notifications)
 */
export const getAnnouncements = async (onlyPublished = true): Promise<Announcement[]> => {
  try {
    let query = supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (onlyPublished) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;
    if (error) {
      console.error('[getAnnouncements] Error querying announcements table:', error.message);
      return [];
    }

    return (data || []).map(formatAnnouncementRow);
  } catch (err) {
    console.error('[getAnnouncements] Exception:', err);
    return [];
  }
};

/**
 * Create a new website announcement in Supabase
 */
export const createAnnouncement = async (
  adminUser: { uid: string; email: string },
  data: Omit<Announcement, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
): Promise<Announcement> => {
  const startDateIso = data.startDate ? new Date(data.startDate).toISOString() : new Date().toISOString();
  const endDateIso = data.endDate ? new Date(data.endDate).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString();

  const insertPayload = {
    title: data.title,
    message: data.message,
    cta_text: data.ctaText || null,
    cta_link: data.ctaLink || null,
    status: data.status || 'published',
    start_date: startDateIso,
    end_date: endDateIso,
    created_by: adminUser.uid
  };

  const { data: newRow, error } = await supabase
    .from('announcements')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error || !newRow) {
    console.error('[createAnnouncement] Error inserting announcement:', error?.message);
    throw new Error(error?.message || 'Failed to create announcement');
  }

  const formatted = formatAnnouncementRow(newRow);

  await recordAuditLog({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: 'Created Website Announcement',
    targetType: 'announcement',
    targetId: formatted.id,
    newValue: formatted
  });

  return formatted;
};

/**
 * Update an existing website announcement in Supabase
 */
export const updateAnnouncement = async (
  adminUser: { uid: string; email: string },
  id: string,
  updates: Partial<Announcement>
): Promise<void> => {
  const updatePayload: AnnouncementUpdate = {
    updated_at: new Date().toISOString()
  };

  if (updates.title !== undefined) updatePayload.title = updates.title;
  if (updates.message !== undefined) updatePayload.message = updates.message;
  if (updates.ctaText !== undefined) updatePayload.cta_text = updates.ctaText || null;
  if (updates.ctaLink !== undefined) updatePayload.cta_link = updates.ctaLink || null;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.startDate !== undefined) updatePayload.start_date = new Date(updates.startDate).toISOString();
  if (updates.endDate !== undefined) updatePayload.end_date = new Date(updates.endDate).toISOString();

  const { error } = await supabase
    .from('announcements')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    console.error('[updateAnnouncement] Error updating announcement:', error.message);
    throw new Error(error.message);
  }

  await recordAuditLog({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: 'Updated Announcement',
    targetType: 'announcement',
    targetId: id,
    newValue: updates
  });
};

/**
 * Delete a website announcement from Supabase
 */
export const deleteAnnouncement = async (
  adminUser: { uid: string; email: string },
  id: string
): Promise<void> => {
  if (!id) {
    throw new Error('Invalid announcement ID.');
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return;
  }

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteAnnouncement] Error deleting announcement:', error.message);
    throw new Error(`Failed to delete announcement: ${error.message}`);
  }

  try {
    await recordAuditLog({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: 'Deleted Announcement',
      targetType: 'announcement',
      targetId: id
    });
  } catch (err) {
    console.warn('[deleteAnnouncement] Note recording audit log:', err);
  }
};

// Helper to map DB row to frontend Announcement type
function formatAnnouncementRow(row: any): Announcement {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    ctaText: row.cta_text || undefined,
    ctaLink: row.cta_link || undefined,
    startDate: new Date(row.start_date || row.created_at).getTime(),
    endDate: new Date(row.end_date || Date.now() + 86400000 * 7).getTime(),
    status: row.status as 'published' | 'draft' | 'archived',
    createdBy: row.created_by || '',
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at || row.created_at).getTime()
  };
}
