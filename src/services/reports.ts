import { supabase } from '../lib/supabase';
import { recordAuditLog } from './admin';
import { deleteOpportunityAdmin } from './opportunities';
import { deleteCommunityPost } from './community';

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName?: string;
  reporterEmail?: string;
  targetType: 'opportunity' | 'post';
  targetId: string;
  targetTitle: string;
  targetContent?: string;
  targetSnippet?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  notes?: string;
  adminNotes?: string | null;
  resolvedBy?: string | null;
  createdAt: number;
}

const LOCAL_REPORTS_KEY = 'pm_reports_cache';

const getLocalReports = (): ReportItem[] => {
  try {
    const raw = localStorage.getItem(LOCAL_REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalReports = (reports: ReportItem[]) => {
  try {
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(reports));
  } catch (err) {
    console.warn('Failed to save reports locally:', err);
  }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Submit a report for an opportunity or community post.
 * Inserts directly to Supabase `reports` table with RLS enforcement.
 */
export const createReport = async (payload: {
  reporterId: string;
  reporterName?: string;
  reporterEmail?: string;
  targetType: 'opportunity' | 'post';
  targetId: string;
  targetTitle: string;
  targetContent?: string;
  reason: string;
  details?: string;
}): Promise<ReportItem> => {
  // Validate reporterId is a genuine UUID
  if (!payload.reporterId || !UUID_REGEX.test(payload.reporterId)) {
    throw new Error('Authentication required: You must be signed in with a valid account to submit a report.');
  }

  const fullReason = payload.details && payload.details.trim()
    ? `${payload.reason} - Details: ${payload.details.trim()}`
    : payload.reason;

  const formattedReason = payload.targetTitle
    ? `[${payload.targetTitle}] ${fullReason}`
    : fullReason;

  // Insert to Supabase reports table (let PostgreSQL assign gen_random_uuid())
  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: payload.reporterId,
      target_type: payload.targetType,
      target_id: payload.targetId,
      reason: formattedReason,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('[createReport] Supabase error:', error);
    if (error.code === '42501') {
      throw new Error('Permission denied: You must be signed in with your Pixel Minds account to submit reports.');
    }
    throw new Error(error.message || 'Failed to submit report. Please try again.');
  }

  const newReport: ReportItem = {
    id: data.id,
    reporterId: data.reporter_id,
    reporterName: payload.reporterName || 'Community Member',
    reporterEmail: payload.reporterEmail || '',
    targetType: data.target_type as 'opportunity' | 'post',
    targetId: data.target_id,
    targetTitle: payload.targetTitle,
    targetContent: payload.targetContent || '',
    reason: payload.reason,
    details: payload.details,
    status: data.status as 'pending' | 'resolved' | 'dismissed',
    createdAt: new Date(data.created_at).getTime()
  };

  const currentLocal = getLocalReports();
  saveLocalReports([newReport, ...currentLocal]);

  return newReport;
};

/**
 * Admin: Get all reports from Supabase.
 */
export const getAllReports = async (): Promise<ReportItem[]> => {
  const localReports = getLocalReports();

  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const remoteReports: ReportItem[] = data.map((row: any) => {
        let extractedTitle = `Reported ${row.target_type}`;
        let cleanReason = row.reason || '';
        let cleanDetails: string | undefined = undefined;

        if (row.reason) {
          const titleMatch = row.reason.match(/^\[(.*?)\]\s*(.*)$/);
          if (titleMatch) {
            extractedTitle = titleMatch[1];
            cleanReason = titleMatch[2];
          }
          const detailsMatch = cleanReason.match(/^(.*?)\s*-\s*Details:\s*(.*)$/);
          if (detailsMatch) {
            cleanReason = detailsMatch[1];
            cleanDetails = detailsMatch[2];
          }
        }

        return {
          id: row.id,
          reporterId: row.reporter_id,
          reporterName: 'Community Member',
          reporterEmail: '',
          targetType: (row.target_type === 'opportunity' ? 'opportunity' : 'post') as 'opportunity' | 'post',
          targetId: row.target_id,
          targetTitle: extractedTitle,
          targetContent: row.reason,
          targetSnippet: row.reason,
          reason: cleanReason,
          details: cleanDetails,
          status: (row.status || 'pending') as 'pending' | 'resolved' | 'dismissed',
          notes: row.admin_notes || '',
          adminNotes: row.admin_notes || '',
          resolvedBy: row.resolved_by,
          createdAt: new Date(row.created_at).getTime()
        };
      });

      // Merge remote with local cache
      const map = new Map<string, ReportItem>();
      remoteReports.forEach(r => map.set(r.id, r));
      localReports.forEach(r => {
        if (!map.has(r.id)) map.set(r.id, r);
      });

      const merged = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
      saveLocalReports(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Supabase reports fetch note:', err);
  }

  return localReports;
};

/**
 * Admin: Mark a report as resolved.
 */
export const resolveReport = async (
  reportId: string,
  adminNotes?: string,
  adminUser?: { uid: string; email: string }
): Promise<void> => {
  const reports = getLocalReports();
  const idx = reports.findIndex(r => r.id === reportId);
  if (idx !== -1) {
    reports[idx].status = 'resolved';
    reports[idx].adminNotes = adminNotes;
    reports[idx].resolvedBy = adminUser?.uid;
    saveLocalReports(reports);
  }

  const resolvedByUuid = adminUser?.uid && UUID_REGEX.test(adminUser.uid) ? adminUser.uid : null;

  const { error } = await supabase.from('reports').update({
    status: 'resolved',
    admin_notes: adminNotes || null,
    resolved_by: resolvedByUuid,
    updated_at: new Date().toISOString()
  }).eq('id', reportId);

  if (error) {
    console.warn('Failed to update report status in Supabase:', error);
    throw new Error(error.message || 'Failed to update report in database');
  }

  if (adminUser) {
    try {
      await recordAuditLog({
        adminId: adminUser.uid,
        adminEmail: adminUser.email,
        action: 'Resolved report',
        targetType: 'opportunity',
        targetId: reportId,
        reason: adminNotes || 'Admin marked report as resolved'
      });
    } catch {}
  }
};

/**
 * Admin: Dismiss a report.
 */
export const dismissReport = async (
  reportId: string,
  adminUser?: { uid: string; email: string }
): Promise<void> => {
  const reports = getLocalReports();
  const idx = reports.findIndex(r => r.id === reportId);
  if (idx !== -1) {
    reports[idx].status = 'dismissed';
    reports[idx].resolvedBy = adminUser?.uid;
    saveLocalReports(reports);
  }

  const resolvedByUuid = adminUser?.uid && UUID_REGEX.test(adminUser.uid) ? adminUser.uid : null;

  const { error } = await supabase.from('reports').update({
    status: 'dismissed',
    resolved_by: resolvedByUuid,
    updated_at: new Date().toISOString()
  }).eq('id', reportId);

  if (error) {
    console.warn('Failed to dismiss report in Supabase:', error);
    throw new Error(error.message || 'Failed to dismiss report in database');
  }

  if (adminUser) {
    try {
      await recordAuditLog({
        adminId: adminUser.uid,
        adminEmail: adminUser.email,
        action: 'Dismissed report',
        targetType: 'opportunity',
        targetId: reportId,
        reason: 'Report dismissed by admin'
      });
    } catch {}
  }
};

/**
 * Admin: Permanently delete the reported item (opportunity or post) and mark report as resolved.
 */
export const deleteReportedItem = async (
  reportId: string,
  targetType: 'opportunity' | 'post',
  targetId: string,
  adminUser?: { uid: string; email: string }
): Promise<void> => {
  if (targetType === 'opportunity') {
    await deleteOpportunityAdmin(targetId);
  } else if (targetType === 'post') {
    await deleteCommunityPost(targetId);
  }

  await resolveReport(reportId, `Permanently deleted reported ${targetType}`, adminUser);

  if (adminUser) {
    try {
      await recordAuditLog({
        adminId: adminUser.uid,
        adminEmail: adminUser.email,
        action: `Deleted reported ${targetType}`,
        targetType: targetType === 'opportunity' ? 'opportunity' : 'post',
        targetId,
        reason: `Enforced moderation from report ${reportId}`
      });
    } catch {}
  }
};
