import { supabase } from '../lib/supabase';
import type { 
  AuditLog, 
  CommunityPost, 
  Opportunity,
  User 
} from '../types';

// ==========================================
// AUDIT LOG SERVICE (Supabase)
// ==========================================
export const recordAuditLog = async (logData: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> => {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(logData.adminId);
    await supabase.from('audit_logs').insert({
      admin_id: isUuid ? logData.adminId : '00000000-0000-0000-0000-000000000000',
      admin_email: logData.adminEmail || 'admin@pixelminds.org',
      action: logData.action,
      target_type: logData.targetType,
      target_id: String(logData.targetId),
      reason: logData.reason || null,
      previous_value: logData.previousValue || null,
      new_value: logData.newValue || null
    });
  } catch (err) {
    console.warn('[recordAuditLog] Note recording audit log:', err);
  }
};

export const getAuditLogs = async (maxLogs = 50): Promise<AuditLog[]> => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(maxLogs);

    if (error) {
      console.warn('[getAuditLogs] Note reading audit_logs:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      adminId: row.admin_id,
      adminEmail: row.admin_email,
      action: row.action,
      targetType: row.target_type as any,
      targetId: row.target_id,
      reason: row.reason || undefined,
      previousValue: row.previous_value,
      newValue: row.new_value,
      createdAt: new Date(row.created_at).getTime()
    }));
  } catch (err) {
    console.error('[getAuditLogs] Exception:', err);
    return [];
  }
};

// ==========================================
// REWARD CONFIG SERVICE (Supabase)
// ==========================================
export { 
  DEFAULT_REWARD_CONFIG,
  getRewardConfig, 
  updateRewardConfig,
  adjustUserPixels,
  getPixelTransactions,
  getAllUsersAdmin,
  toggleUserSuspension
} from './pixels';

// ==========================================
// ADMIN COMMUNITY POSTS (Supabase)
// ==========================================
export { getCommunityPosts } from './community';

export const createAdminCommunityPost = async (
  adminUser: { uid: string; email: string; displayName?: string },
  postData: {
    text: string;
    category?: string;
    opp?: string | number;
    link?: string;
    imageUrl?: string;
    status?: 'published' | 'draft';
    featured?: boolean;
  }
): Promise<CommunityPost> => {
  const { createAdminCommunityPost: createSupabaseAdminPost } = await import('./community');
  const post = await createSupabaseAdminPost(adminUser, postData);

  try {
    await recordAuditLog({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: `Created Community Post (${post.status})`,
      targetType: 'post',
      targetId: post.id,
      newValue: post
    });
  } catch (err) {
    console.warn('Failed to record audit log for community post:', err);
  }

  return post;
};

export const updateCommunityPost = async (
  adminUser: { uid: string; email: string },
  id: string,
  updates: Partial<CommunityPost>
): Promise<void> => {
  const { updateCommunityPost: updateSupabasePost } = await import('./community');
  await updateSupabasePost(id, updates);

  try {
    await recordAuditLog({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: 'Updated Community Post',
      targetType: 'post',
      targetId: id,
      newValue: updates
    });
  } catch (err) {
    console.warn('Failed to record audit log for community post:', err);
  }
};

export const deleteCommunityPost = async (
  adminUser: { uid: string; email: string },
  id: string
): Promise<void> => {
  const { deleteCommunityPost: deleteSupabasePost } = await import('./community');
  await deleteSupabasePost(id);

  try {
    await recordAuditLog({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: 'Deleted Community Post',
      targetType: 'post',
      targetId: id
    });
  } catch (err) {
    console.warn('Failed to record audit log for community post:', err);
  }
};

// ==========================================
// ADMIN ANNOUNCEMENTS (Supabase)
// ==========================================
export {
  getActiveAnnouncements,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from './announcements';

// ==========================================
// ADMIN NOTIFICATIONS (Supabase)
// ==========================================
export {
  sendAdminNotification,
  getAdminSentNotifications,
  deleteAdminNotification
} from './notifications';

// ==========================================
// DASHBOARD METRICS SERVICE
// ==========================================
export interface AdminMetrics {
  totalUsers: number;
  publishedOpportunities: number;
  pendingSubmissions: number;
  communityPosts: number;
  totalReferrals: number;
  pixelsIssued: number;
  totalViews: number;
  totalApplyClicks: number;
  totalReports: number;
}

export const getRealAdminMetrics = async (
  opportunities: Opportunity[],
  users: User[],
  posts: CommunityPost[]
): Promise<AdminMetrics> => {
  let views = 0;
  let applyClicks = 0;
  let published = 0;
  let pending = 0;

  opportunities.forEach(o => {
    if (o.status === 'published') published++;
    if (o.status === 'pending') pending++;
    views += o.views || 0;
    applyClicks += o.applyClicks || 0;
  });

  let totalPixels = 0;
  let totalReferrals = 0;

  users.forEach(u => {
    totalPixels += u.pixels || 0;
    totalReferrals += u.referrals || 0;
  });

  return {
    totalUsers: users.length,
    publishedOpportunities: published,
    pendingSubmissions: pending,
    communityPosts: posts.length,
    totalReferrals,
    pixelsIssued: totalPixels,
    totalViews: views,
    totalApplyClicks: applyClicks,
    totalReports: 0
  };
};
