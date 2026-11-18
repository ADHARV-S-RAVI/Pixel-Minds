import { useState, useEffect } from 'react';
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
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../services/notifications';
import type { AppNotification } from '../types';

export function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const fetchNotifications = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    try {
      const data = await getUserNotifications(user.uid);
      if (data.length === 0) {
        const welcomeKey = `pm_notif_read_welcome_${user.uid}`;
        const isWelcomeRead = localStorage.getItem(welcomeKey) === 'true';
        const welcomeNotif: AppNotification = {
          id: `welcome_${user.uid}`,
          notificationId: 'welcome',
          title: 'Welcome to Pixel Minds!',
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
      console.error('[Notifications Page] Failed to fetch:', err);
      setFetchError(err?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.uid]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
      window.dispatchEvent(new CustomEvent('pm:notification-update'));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAll = async () => {
    if (!user?.uid || unreadCount === 0) return;
    try {
      localStorage.setItem(`pm_notif_read_welcome_${user.uid}`, 'true');
      await markAllNotificationsAsRead(user.uid);
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true, readAt: Date.now() }))
      );
      window.dispatchEvent(new CustomEvent('pm:notification-update'));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, n: AppNotification) => {
    e.stopPropagation();
    try {
      if (!n.id.startsWith('welcome_')) {
        await deleteNotification(n.id);
      }
      setNotifications((prev) => prev.filter((item) => item.id !== n.id));
      window.dispatchEvent(new CustomEvent('pm:notification-update'));
    } catch (err) {
      console.error('Failed to delete notification:', err);
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
        window.dispatchEvent(new CustomEvent('pm:notification-update'));
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
    if (n.link) {
      if (n.link.startsWith('http://') || n.link.startsWith('https://')) {
        window.open(n.link, '_blank', 'noopener,noreferrer');
      } else {
        navigate(n.link);
      }
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <FileCheck2 size={18} className="text-blue-500 dark:text-sky-400" />;
      case 'pixel':
        return <Sparkles size={18} className="text-amber-500 dark:text-amber-400" />;
      case 'announcement':
        return <AlertCircle size={18} className="text-indigo-500 dark:text-indigo-400" />;
      default:
        return <Inbox size={18} className="text-blue-500 dark:text-sky-400" />;
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto w-full px-2 sm:px-4 py-4 sm:py-6 space-y-5">
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full pm-glass-control text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
      </div>

      {/* Top Header Card */}
      <div className="pm-glass rounded-[24px] p-5 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-sky-400 border border-blue-500/20 shadow-xs shrink-0">
            <Bell size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-[#0e1b33] dark:text-white tracking-tight">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-blue-600 text-white shadow-xs">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Updates on opportunities, reviews, rewards, and announcements.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold pm-glass-control hover:bg-white/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition cursor-pointer shrink-0"
          >
            <CheckCheck size={15} className="text-blue-600 dark:text-sky-400" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'all'
                ? 'bg-[#0B1628] dark:bg-blue-600 text-white shadow-sm'
                : 'pm-glass-control text-slate-700 dark:text-slate-300 hover:text-blue-600'
            }`}
          >
            <span>All</span>
            <span className="text-[10px] opacity-75">({notifications.length})</span>
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'unread'
                ? 'bg-[#0B1628] dark:bg-blue-600 text-white shadow-sm'
                : 'pm-glass-control text-slate-700 dark:text-slate-300 hover:text-blue-600'
            }`}
          >
            <span>Unread</span>
            <span className="text-[10px] opacity-75">({unreadCount})</span>
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'read'
                ? 'bg-[#0B1628] dark:bg-blue-600 text-white shadow-sm'
                : 'pm-glass-control text-slate-700 dark:text-slate-300 hover:text-blue-600'
            }`}
          >
            <span>Read</span>
            <span className="text-[10px] opacity-75">({notifications.length - unreadCount})</span>
          </button>
        </div>

        {fetchError && (
          <button
            onClick={fetchNotifications}
            className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
          >
            Retry Sync
          </button>
        )}
      </div>

      {/* Main List Container */}
      <div className="pm-glass rounded-[24px] overflow-hidden divide-y divide-slate-200/50 dark:divide-slate-800/60 shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mb-3" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Loading your notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-500/10 dark:bg-slate-800/80 text-blue-600 dark:text-slate-400 mb-3 border border-blue-500/20">
              <Bell size={28} className="opacity-70" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mt-1">
              {filter === 'unread'
                ? 'You are all caught up! When opportunities get updated or reviewed, you will see them here.'
                : 'Your notifications history will appear here once you engage with opportunities and community posts.'}
            </p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`flex items-start gap-3.5 sm:gap-4 p-4 sm:p-5 transition-all cursor-pointer group ${
                !n.isRead
                  ? 'bg-blue-500/[0.07] dark:bg-blue-500/[0.12] hover:bg-blue-500/[0.12] dark:hover:bg-blue-500/[0.18]'
                  : 'hover:bg-white/60 dark:hover:bg-white/[0.04]'
              }`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-white dark:border-slate-700 shadow-xs text-blue-600 dark:text-sky-400 mt-0.5">
                {getIcon(n.type)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-bold ${!n.isRead ? 'text-[#0e1b33] dark:text-white font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                      {n.title}
                    </h4>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                    {formatTimeAgo(n.createdAt)}
                  </span>
                </div>

                <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                  {n.message}
                </p>

                {n.link && (
                  <span className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-sky-400 group-hover:underline">
                    <span>View opportunity</span>
                    <ExternalLink size={12} />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 self-center pl-1 sm:pl-2">
                {!n.isRead && (
                  <button
                    onClick={(e) => handleMarkOne(e, n)}
                    title="Mark as read"
                    className="grid h-8 w-8 place-items-center rounded-xl pm-glass-control hover:bg-white text-blue-600 dark:text-sky-400 transition cursor-pointer"
                  >
                    <Check size={14} strokeWidth={2.5} />
                  </button>
                )}
                {!n.id.startsWith('welcome_') && (
                  <button
                    onClick={(e) => handleDelete(e, n)}
                    title="Delete notification"
                    className="grid h-8 w-8 place-items-center rounded-xl pm-glass-control hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition cursor-pointer opacity-70 hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
