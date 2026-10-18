import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Sparkles,
  Inbox,
  AlertCircle,
  FileCheck2,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../services/notifications';
import type { AppNotification } from '../types';

export const NotificationBell: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user?.uid) return;
    try {
      const data = await getUserNotifications(user.uid);
      setNotifications(data);
      setFetchError(null);
    } catch (err: any) {
      console.error('[NotificationBell] Failed to fetch notifications:', err);
      setFetchError(err?.message || 'Failed to fetch notifications');
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setFetchError(null);
      return;
    }

    // Initial fetch
    fetchNotifications();

    // 1. Supabase Realtime subscription with safe UUID check & collision prevention
    let channel: any = null;
    const isUuid = !!user.uid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.uid);
    if (isUuid) {
      try {
        const uniqueTopic = `user-notifs-${user.uid}-${Math.random().toString(36).slice(2, 7)}`;
        channel = supabase
          .channel(uniqueTopic)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_notifications',
              filter: `user_id=eq.${user.uid}`
            },
            () => {
              fetchNotifications();
            }
          )
          .subscribe();
      } catch (realtimeErr) {
        console.warn('[NotificationBell] Realtime subscription notice:', realtimeErr);
      }
    }

    // 2. Reliable polling fallback (every 8s)
    const interval = setInterval(fetchNotifications, 8000);

    // 3. Focus & visibility change triggers
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };
    const handleWindowFocus = () => fetchNotifications();
    const handleNotificationUpdateEvent = () => fetchNotifications();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pm:notification-update', handleNotificationUpdateEvent);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pm:notification-update', handleNotificationUpdateEvent);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, [user?.uid]);

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const handleMarkOne = async (e: React.MouseEvent, n: AppNotification) => {
    e.stopPropagation();
    if (n.isRead) return;
    try {
      await markNotificationAsRead(n.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true, readAt: Date.now() } : item))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAll = async () => {
    if (!user?.uid || unreadCount === 0) return;
    setLoading(true);
    try {
      await markAllNotificationsAsRead(user.uid);
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true, readAt: Date.now() }))
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.isRead) {
      try {
        await markNotificationAsRead(n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true, readAt: Date.now() } : item))
        );
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
    setIsOpen(false);
    if (n.link) {
      if (n.link.startsWith('http://') || n.link.startsWith('https://')) {
        window.open(n.link, '_blank', 'noopener,noreferrer');
      } else {
        navigate(n.link);
      }
    }
  };

  if (!user) return null;

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <FileCheck2 size={16} className="text-sky-600" />;
      case 'pixel':
        return <Sparkles size={16} className="text-amber-500" />;
      case 'announcement':
        return <AlertCircle size={16} className="text-indigo-500" />;
      default:
        return <Inbox size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none"
      >
        <Bell size={18} className={unreadCount > 0 ? 'text-slate-800' : 'text-slate-600'} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50 duration-200">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {unreadCount === 0 && fetchError && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-amber-500 shadow-xs" title="Sync alert" />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden pm-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline disabled:opacity-50"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-200/50"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Sync / Database Error Alert */}
          {fetchError && (
            <div className="bg-rose-50 border-b border-rose-100 p-3 flex items-start gap-2.5 text-rose-800">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">Notification sync alert</p>
                <p className="text-[11px] text-rose-700 leading-snug mt-0.5 break-words">
                  {fetchError}
                </p>
              </div>
              <button
                onClick={() => fetchNotifications()}
                className="shrink-0 text-[11px] font-bold text-rose-700 underline hover:text-rose-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400 mb-2">
                  <Bell size={22} className="opacity-50" />
                </div>
                <p className="text-xs font-bold text-slate-800">No notifications yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  You're all caught up! Updates regarding your submissions will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left ${
                    !n.isRead
                      ? 'bg-sky-50/50 hover:bg-sky-50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white border border-slate-200/80 shadow-2xs mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-bold truncate ${!n.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-slate-400 font-medium">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    {n.link && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:underline">
                        <span>View Details</span>
                        <ExternalLink size={10} />
                      </span>
                    )}
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={(e) => handleMarkOne(e, n)}
                      title="Mark as read"
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200 transition"
                    >
                      <Check size={11} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
