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
  X,
  ChevronRight
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
  const [showPopup, setShowPopup] = useState(false);
  const [popupNotification, setPopupNotification] = useState<AppNotification | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const popupTimeoutRef = useRef<any>(null);

  const fetchNotifications = async () => {
    if (!user?.uid) return;
    try {
      const data = await getUserNotifications(user.uid);

      // If user has zero notifications in database, provide a friendly welcome notification
      if (data.length === 0) {
        const welcomeKey = `pm_notif_read_welcome_${user.uid}`;
        const isWelcomeRead = localStorage.getItem(welcomeKey) === 'true';
        const welcomeNotif: AppNotification = {
          id: `welcome_${user.uid}`,
          notificationId: 'welcome',
          title: 'Welcome to Pixel Minds! 🚀',
          message: 'Explore hackathons, earn Pixels, and climb the global builder leaderboard.',
          type: 'pixel',
          link: '/opportunities',
          isRead: isWelcomeRead,
          readAt: isWelcomeRead ? Date.now() : null,
          createdAt: Date.now()
        };
        setNotifications([welcomeNotif]);
      } else {
        setNotifications(data);
      }
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
      setShowPopup(false);
      setPopupNotification(null);
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

    // 4. Custom event for immediate notification trigger & popup
    const handleNewNotificationEvent = (e: any) => {
      fetchNotifications();
      if (e.detail) {
        triggerNotificationPopup(e.detail);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pm:notification-update', handleNotificationUpdateEvent);
    window.addEventListener('pm:new-notification', handleNewNotificationEvent);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pm:notification-update', handleNotificationUpdateEvent);
      window.removeEventListener('pm:new-notification', handleNewNotificationEvent);
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, [user?.uid]);

  // Trigger popup when new unread notification is detected
  const triggerNotificationPopup = (n: AppNotification) => {
    setPopupNotification(n);
    setShowPopup(true);
    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    popupTimeoutRef.current = setTimeout(() => {
      setShowPopup(false);
    }, 6000);
  };

  // Check unread notifications and show popup banner if not shown in current session
  useEffect(() => {
    if (notifications.length === 0 || !user?.uid) return;
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length > 0) {
      const latest = unread[0];
      const sessionKey = `pm_notif_popup_seen_${latest.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, 'true');
        triggerNotificationPopup(latest);
      }
    }
  }, [notifications, user?.uid]);

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
    setShowPopup(false);
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const handleMarkOne = async (e: React.MouseEvent, n: AppNotification) => {
    e.stopPropagation();
    if (n.isRead) return;
    try {
      if (n.id.startsWith('welcome_') && user?.uid) {
        localStorage.setItem(`pm_notif_read_welcome_${user.uid}`, 'true');
      } else {
        await markNotificationAsRead(n.id);
      }
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
      localStorage.setItem(`pm_notif_read_welcome_${user.uid}`, 'true');
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
        if (n.id.startsWith('welcome_') && user?.uid) {
          localStorage.setItem(`pm_notif_read_welcome_${user.uid}`, 'true');
        } else {
          await markNotificationAsRead(n.id);
        }
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true, readAt: Date.now() } : item))
        );
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
    setIsOpen(false);
    setShowPopup(false);
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
        return <FileCheck2 size={16} className="text-sky-400" />;
      case 'pixel':
        return <Sparkles size={16} className="text-amber-400" />;
      case 'announcement':
        return <AlertCircle size={16} className="text-sky-300" />;
      default:
        return <Inbox size={16} className="text-sky-400" />;
    }
  };

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      {/* Bell Trigger Button - Clean white glass with vibrant badge matching nav */}
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-full bg-white/70 hover:bg-white text-slate-700 border border-white/90 shadow-xs transition hover:text-blue-600 focus:outline-none cursor-pointer"
      >
        <Bell size={18} className={unreadCount > 0 ? 'text-blue-600' : 'text-slate-600'} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-600 px-1 text-[10px] font-black text-white shadow-md shadow-red-500/30 ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {unreadCount === 0 && fetchError && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-amber-400 shadow-xs" title="Sync alert" />
        )}
      </button>

      {/* Pop-up Toast Banner when notification arrives or unread */}
      {showPopup && popupNotification && !isOpen && (
        <div className="fixed inset-x-3.5 top-16 z-50 w-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-80 sm:max-w-[320px] rounded-2xl bg-[#0B1628]/95 backdrop-blur-xl text-white p-3.5 shadow-2xl border border-sky-400/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-500/20 text-sky-400 mt-0.5">
              <Bell size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
                  New Notification
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPopup(false);
                  }}
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
              <p className="text-xs font-bold text-white mt-0.5 break-words line-clamp-2">
                {popupNotification.title}
              </p>
              <p className="text-[11px] text-slate-300 line-clamp-3 mt-0.5 leading-snug break-words">
                {popupNotification.message}
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowPopup(false);
                    setIsOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                >
                  <span>View Notifications</span>
                  <ChevronRight size={11} />
                </button>
                <button
                  onClick={() => setShowPopup(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown Panel in Professional Dark Navy */}
      {isOpen && (
        <>
          {/* Mobile Backdrop to catch taps outside and prevent layout interference */}
          <div
            className="fixed inset-0 z-40 sm:hidden bg-slate-900/30 backdrop-blur-2xs"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-3.5 top-16 z-50 w-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-96 sm:max-w-[384px] rounded-3xl border border-sky-500/20 bg-[#0B1628]/95 backdrop-blur-2xl shadow-2xl overflow-hidden text-white pm-in max-h-[calc(100vh-5.5rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAll}
                    disabled={loading}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 hover:underline disabled:opacity-50 cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck size={13} />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Sync / Database Error Alert */}
            {fetchError && (
              <div className="bg-rose-500/10 border-b border-rose-500/20 p-3 flex items-start gap-2.5 text-rose-300 shrink-0">
                <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">Notification sync alert</p>
                  <p className="text-[11px] text-rose-300 leading-snug mt-0.5 break-words">
                    {fetchError}
                  </p>
                </div>
                <button
                  onClick={() => fetchNotifications()}
                  className="shrink-0 text-[11px] font-bold text-rose-300 underline hover:text-white cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className="overflow-y-auto divide-y divide-white/5 flex-1 min-h-0">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-zinc-400 mb-2">
                    <Bell size={22} className="opacity-50" />
                  </div>
                  <p className="text-xs font-bold text-white">No notifications yet</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
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
                        ? 'bg-white/10 hover:bg-white/15'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10 border border-white/10 shadow-2xs mt-0.5 text-sky-400">
                      {getIcon(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <p className={`text-xs font-bold break-words line-clamp-2 ${!n.isRead ? 'text-white' : 'text-zinc-300'}`}>
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-zinc-400 font-medium whitespace-nowrap pl-1">
                          {formatTimeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-300 break-words line-clamp-3 leading-relaxed">
                        {n.message}
                      </p>
                      {n.link && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:underline">
                          <span>View Details</span>
                          <ExternalLink size={10} />
                        </span>
                      )}
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={(e) => handleMarkOne(e, n)}
                        title="Mark as read"
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition cursor-pointer"
                      >
                        <Check size={11} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
