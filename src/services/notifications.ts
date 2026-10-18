import { supabase } from '../lib/supabase';
import type { AppNotification, AdminSentNotification } from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fetch all notifications for the given user, joined with notification details.
 * Ordered newest first.
 */
export const getUserNotifications = async (userId: string): Promise<AppNotification[]> => {
  if (!userId || !UUID_REGEX.test(userId)) return [];

  const { data, error } = await supabase
    .from('user_notifications')
    .select(`
      id,
      user_id,
      notification_id,
      is_read,
      read_at,
      created_at,
      notifications (
        id,
        title,
        message,
        type,
        link,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getUserNotifications] Error querying user_notifications:', error);
    return [];
  }

  // Double-layer safety: if RLS join returned null for notifications, query them directly
  const missingNotifIds = (data || [])
    .filter((row: any) => {
      const raw = row.notifications;
      const resolved = Array.isArray(raw) ? raw[0] : raw;
      return (!resolved || !resolved.title) && row.notification_id && UUID_REGEX.test(row.notification_id);
    })
    .map((row: any) => row.notification_id);

  const fallbackMap = new Map<string, any>();
  if (missingNotifIds.length > 0) {
    try {
      const { data: directRows, error: directErr } = await supabase
        .from('notifications')
        .select('id, title, message, type, link, created_at')
        .in('id', missingNotifIds);

      if (directErr) {
        console.warn('[getUserNotifications] Fallback query returned error:', directErr.message);
      } else {
        (directRows || []).forEach((r: any) => fallbackMap.set(r.id, r));
      }
    } catch (e) {
      console.warn('[getUserNotifications] Fallback notifications fetch exception:', e);
    }
  }

  const unreadableCount = (data || []).filter((row: any) => {
    const raw = row.notifications;
    const resolved = (Array.isArray(raw) ? raw[0] : raw) || fallbackMap.get(row.notification_id);
    return !resolved || !resolved.title;
  }).length;

  if (unreadableCount > 0 && (data || []).length > 0) {
    console.warn(`[getUserNotifications] Found ${unreadableCount} notification(s), but notification details could not be read. Please ensure the Supabase SQL migration (user_has_notification function & RLS policy) is applied in your Supabase SQL Editor.`);
  }

  const results: AppNotification[] = [];
  for (const row of (data || [])) {
    const raw = (row as any).notifications;
    const n = (Array.isArray(raw) ? raw[0] : raw) || fallbackMap.get((row as any).notification_id);
    if (!n || !n.title) {
      continue;
    }
    results.push({
      id: (row as any).id,
      notificationId: (row as any).notification_id,
      title: n.title,
      message: n.message || '',
      type: (n.type || 'system') as AppNotification['type'],
      link: n.link || null,
      isRead: !!(row as any).is_read,
      readAt: (row as any).read_at ? new Date((row as any).read_at).getTime() : null,
      createdAt: new Date((row as any).created_at).getTime()
    });
  }

  return results;
};

/**
 * Mark a single user notification as read.
 */
export const markNotificationAsRead = async (userNotificationId: string): Promise<void> => {
  if (!userNotificationId) return;

  const { error } = await supabase
    .from('user_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', userNotificationId);

  if (error) {
    console.error('[markNotificationAsRead] Error:', error.message);
    throw new Error(error.message || 'Failed to mark notification as read');
  }

  window.dispatchEvent(new CustomEvent('pm:notification-update'));
};

/**
 * Mark all unread notifications for a user as read.
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  if (!userId) return;

  const { error } = await supabase
    .from('user_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('[markAllNotificationsAsRead] Error:', error.message);
    throw new Error(error.message || 'Failed to mark all notifications as read');
  }

  window.dispatchEvent(new CustomEvent('pm:notification-update'));
};

/**
 * Admin action helper: create a notification for the submitter upon approval or rejection.
 * Prevents duplicate review notifications if the action is retried.
 */
export const createReviewNotification = async ({
  targetUserId,
  adminId,
  submissionId,
  opportunityTitle,
  action,
  rejectionReason,
  opportunityId
}: {
  targetUserId: string;
  adminId?: string;
  submissionId: string;
  opportunityTitle: string;
  action: 'approved' | 'rejected';
  rejectionReason?: string;
  opportunityId?: string;
}): Promise<void> => {
  if (!targetUserId) {
    throw new Error('Target user ID is missing for review notification.');
  }

  const title = action === 'approved'
    ? 'Opportunity Submission Approved'
    : 'Opportunity Submission Not Approved';

  const message = action === 'approved'
    ? `Your opportunity submission '${opportunityTitle}' has been approved and published.`
    : `Your opportunity submission '${opportunityTitle}' was not approved.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`;

  const link = action === 'approved' && opportunityId
    ? `/opportunities/${opportunityId}`
    : `/profile?tab=My+Submissions&id=${submissionId}`;

  // Safe UUID check for adminId (prevents foreign key violation if mock/string)
  const safeAdminId = (adminId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminId))
    ? adminId
    : null;

  // 1. Check for duplicate notification for this user & action without broken embedded join syntax
  try {
    const { data: matchedNotifs } = await supabase
      .from('notifications')
      .select('id')
      .eq('title', title)
      .eq('link', link)
      .limit(5);

    if (matchedNotifs && matchedNotifs.length > 0) {
      const notifIds = matchedNotifs.map(n => n.id);
      const { data: existingUserNotifs } = await supabase
        .from('user_notifications')
        .select('id')
        .eq('user_id', targetUserId)
        .in('notification_id', notifIds)
        .limit(1);

      if (existingUserNotifs && existingUserNotifs.length > 0) {
        console.log('[createReviewNotification] Duplicate review notification detected, skipping insert.');
        return;
      }
    }
  } catch (dedupErr) {
    console.warn('[createReviewNotification] Note checking duplicate notification:', dedupErr);
  }

  // Dispatch via atomic security definer RPC
  const { error: rpcErr } = await (supabase.rpc as any)('send_notification_rpc', {
    p_title: title,
    p_message: message,
    p_type: 'opportunity',
    p_link: link,
    p_target_user_id: targetUserId,
    p_admin_id: safeAdminId
  });

  if (rpcErr) {
    console.error('[createReviewNotification] RPC error:', rpcErr);
    if (rpcErr.code === 'PGRST202' || rpcErr.message?.includes('send_notification_rpc') || rpcErr.code === '42883') {
      throw new Error(
        'Database function "send_notification_rpc" not found in Supabase. Please apply the SQL migration in Supabase SQL Editor.'
      );
    }
    throw new Error(rpcErr.message || 'Failed to dispatch review notification via RPC.');
  }

  window.dispatchEvent(new CustomEvent('pm:notification-update'));
};

/**
 * Admin: Send a manual notification to Everyone or a specific registered user.
 * Dispatched exclusively through the secured SECURITY DEFINER RPC.
 */
export const sendAdminNotification = async ({
  adminId,
  title,
  message,
  target,
  targetUserId,
  link,
  type = 'system'
}: {
  adminId?: string;
  title: string;
  message: string;
  target: 'everyone' | 'user';
  targetUserId?: string;
  link?: string;
  type?: 'offer' | 'opportunity' | 'announcement' | 'reminder' | 'community' | 'referral' | 'pixel' | 'system';
}): Promise<{ success: boolean; count: number }> => {
  if (!title.trim() || !message.trim()) {
    throw new Error('Notification title and message are required.');
  }

  if (target === 'user' && !targetUserId) {
    throw new Error('Please select a recipient user.');
  }

  const safeAdminId = (adminId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminId))
    ? adminId
    : null;

  // Dispatch atomic security definer RPC (recipient creation handled inside PostgreSQL)
  const { data: rpcRes, error: rpcErr } = await (supabase.rpc as any)('send_notification_rpc', {
    p_title: title.trim(),
    p_message: message.trim(),
    p_type: type,
    p_link: link?.trim() || null,
    p_target_user_id: target === 'user' ? targetUserId : null,
    p_admin_id: safeAdminId
  });

  if (rpcErr) {
    console.error('[sendAdminNotification] RPC error:', rpcErr);
    if (rpcErr.code === 'PGRST202' || rpcErr.message?.includes('send_notification_rpc') || rpcErr.code === '42883') {
      throw new Error(
        'Database function "send_notification_rpc" not found in Supabase. Please apply the SQL migration in your Supabase SQL Editor.'
      );
    }
    throw new Error(rpcErr.message || 'Failed to dispatch admin notification via RPC.');
  }

  if ((rpcRes as any)?.success) {
    window.dispatchEvent(new CustomEvent('pm:notification-update'));
    return { success: true, count: (rpcRes as any).recipients_count ?? 1 };
  }

  throw new Error((rpcRes as any)?.error || 'Failed to dispatch admin notification.');
};

/**
 * Admin: Fetch all previously sent notifications with recipient stats.
 */
export const getAdminSentNotifications = async (): Promise<AdminSentNotification[]> => {
  try {
    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) {
      console.error('[getAdminSentNotifications] Error:', error.message);
      return [];
    }

    if (!notifs || notifs.length === 0) return [];

    const notifIds = notifs.map(n => n.id);
    const { data: userNotifs } = await supabase
      .from('user_notifications')
      .select('notification_id, user_id')
      .in('notification_id', notifIds);

    const countMap = new Map<string, string[]>();
    (userNotifs || []).forEach(un => {
      const existing = countMap.get(un.notification_id) || [];
      existing.push(un.user_id);
      countMap.set(un.notification_id, existing);
    });

    return notifs.map(n => {
      const userIds = countMap.get(n.id) || [];
      const count = userIds.length;
      let targetDesc = 'Everyone';
      if (count === 1) {
        targetDesc = '1 user';
      } else if (count > 1) {
        targetDesc = `${count} users`;
      } else {
        targetDesc = '0 recipients';
      }

      return {
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link || null,
        createdBy: n.created_by,
        createdAt: new Date(n.created_at).getTime(),
        recipientsCount: count,
        targetDescription: targetDesc
      };
    });
  } catch (err) {
    console.error('[getAdminSentNotifications] Exception:', err);
    return [];
  }
};

/**
 * Admin: Delete a sent notification and all its recipient mappings.
 * Executes the secure delete_notification_rpc (or cascades directly via RLS).
 * Dispatches 'pm:notification-update' to refresh user bells and recipient views.
 */
export const deleteAdminNotification = async (notificationId: string): Promise<void> => {
  if (!notificationId) {
    throw new Error('Notification ID is required for deletion.');
  }

  // Attempt atomic SECURITY DEFINER RPC first
  const { error: rpcErr } = await (supabase.rpc as any)('delete_notification_rpc', {
    p_notification_id: notificationId
  });

  if (rpcErr) {
    // If RPC is missing or fails, attempt direct admin delete (adheres to admin RLS and ON DELETE CASCADE)
    console.warn('[deleteAdminNotification] RPC call failed, falling back to direct delete:', rpcErr.message);

    // 1. Delete recipient records explicitly
    const { error: userNotifsErr } = await supabase
      .from('user_notifications')
      .delete()
      .eq('notification_id', notificationId);

    if (userNotifsErr) {
      console.error('[deleteAdminNotification] Failed to delete user_notifications:', userNotifsErr);
      throw new Error(userNotifsErr.message || 'Failed to remove recipient notification records.');
    }

    // 2. Delete parent notification record
    const { error: notifErr } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (notifErr) {
      console.error('[deleteAdminNotification] Failed to delete notification:', notifErr);
      throw new Error(notifErr.message || 'Failed to delete notification.');
    }
  }

  // Dispatches window event so NotificationBell immediately updates for active users
  window.dispatchEvent(new CustomEvent('pm:notification-update'));
};

