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
  adminNotes?: string;
  resolvedBy?: string;
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

/**
 * Submit a report for an opportunity or community post.
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
}): Promise<ReportItem> => {
  const newReport: ReportItem = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    reporterId: payload.reporterId,
    reporterName: payload.reporterName || 'Community Member',
    reporterEmail: payload.reporterEmail || '',
    targetType: payload.targetType,
    targetId: payload.targetId,
    targetTitle: payload.targetTitle,
    targetContent: payload.targetContent || '',
    reason: payload.reason,
    status: 'pending',
    createdAt: Date.now()
  };

  const currentLocal = getLocalReports();
  saveLocalReports([newReport, ...currentLocal]);

  // Attempt to sync to Supabase reports table
  try {
    await supabase.from('reports').insert({
      id: newReport.id,
      reporter_id: payload.reporterId,
      target_type: payload.targetType,
      target_id: payload.targetId,
      reason: `${payload.targetTitle ? `[${payload.targetTitle}] ` : ''}${payload.reason}`,
      status: 'pending'
    });
  } catch (err) {
    console.warn('Could not sync report to Supabase:', err);
  }

  return newReport;
};

/**
 * Admin: Get all reports.
 */
export const getAllReports = async (): Promise<ReportItem[]> => {
  const localReports = getLocalReports();

  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const remoteReports: ReportItem[] = data.map((row: any) => ({
        id: row.id,
        reporterId: row.reporter_id,
        reporterName: row.reporter_name || 'Community Member',
        reporterEmail: row.reporter_email || '',
        targetType: (row.target_type === 'opportunity' ? 'opportunity' : 'post') as 'opportunity' | 'post',
        targetId: row.target_id,
        targetTitle: row.target_title || `Reported ${row.target_type}`,
        targetContent: row.target_content || row.reason,
        reason: row.reason,
        status: row.status || 'pending',
        adminNotes: row.admin_notes,
        resolvedBy: row.resolved_by,
        createdAt: new Date(row.created_at).getTime()
      }));

      // Merge remote with local
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

  try {
    await supabase.from('reports').update({
      status: 'resolved',
      admin_notes: adminNotes,
      resolved_by: adminUser?.uid,
      updated_at: new Date().toISOString()
    }).eq('id', reportId);
  } catch (err) {
    console.warn('Failed to update report status in Supabase:', err);
  }

  if (adminUser) {
    try {
      await recordAuditLog({
        adminId: adminUser.uid,
        adminEmail: adminUser.email,
        action: 'Resolved report',
        targetType: 'user' as any,
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

  try {
    await supabase.from('reports').update({
      status: 'dismissed',
      resolved_by: adminUser?.uid,
      updated_at: new Date().toISOString()
    }).eq('id', reportId);
  } catch (err) {
    console.warn('Failed to dismiss report in Supabase:', err);
  }

  if (adminUser) {
    try {
      await recordAuditLog({
        adminId: adminUser.uid,
        adminEmail: adminUser.email,
        action: 'Dismissed report',
        targetType: 'user' as any,
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

