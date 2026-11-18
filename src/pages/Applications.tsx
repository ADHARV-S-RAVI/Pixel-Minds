import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Plus,
  Send,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../store';
import {
  getUserApplications,
  confirmOpportunityRegistration,
  type UserApplication
} from '../services/applications';
import { getUserSubmissions } from '../services/opportunities';
import { SubmissionDetailModal } from '../components/SubmissionDetailModal';
import type { Opportunity } from '../types';

export function Applications() {
  const { user, userProfile, refreshProfile, incrementPixels } = useAuth();
  const { say } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab state: 'applications' (My Applications) vs 'submissions' (My Submissions)
  const initialTab = searchParams.get('tab') === 'submissions' ? 'submissions' : 'applications';
  const [activeTab, setActiveTab] = useState<'applications' | 'submissions'>(initialTab);

  const [userApplications, setUserApplications] = useState<UserApplication[]>([]);
  const [rawSubmissions, setRawSubmissions] = useState<Opportunity[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [confirmingAppId, setConfirmingAppId] = useState<string | null>(null);
  const [selectedSubForModal, setSelectedSubForModal] = useState<Opportunity | null>(null);

  // Live timer tick so countdown runs smoothly
  const [, setClockTick] = useState(0);
  useEffect(() => {
    if (activeTab === 'applications') {
      const interval = setInterval(() => setClockTick((c) => c + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const loadApplications = () => {
    if (user?.uid) {
      setLoadingApps(true);
      getUserApplications(user.uid)
        .then(setUserApplications)
        .catch((err) => console.error('Failed to load user applications:', err))
        .finally(() => setLoadingApps(false));
    } else {
      setLoadingApps(false);
    }
  };

  const loadSubmissions = () => {
    if (user?.uid) {
      setLoadingSubs(true);
      getUserSubmissions(user.uid)
        .then(setRawSubmissions)
        .catch((err) => console.error('Failed to load submissions:', err))
        .finally(() => setLoadingSubs(false));
    } else {
      setLoadingSubs(false);
    }
  };

  useEffect(() => {
    loadApplications();
    loadSubmissions();
  }, [user?.uid]);

  const handleTabChange = (tab: 'applications' | 'submissions') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleConfirmRegistration = async (appId: string) => {
    if (!user?.uid) return;
    setConfirmingAppId(appId);
    try {
      const res = await confirmOpportunityRegistration(
        user.uid,
        appId,
        user.email || undefined,
        userProfile?.displayName || user.displayName || undefined
      );
      say(res.message);
      if (res.success) {
        if (incrementPixels && res.pixelsRewarded > 0) {
          incrementPixels(res.pixelsRewarded);
        }
        loadApplications();
        if (refreshProfile) await refreshProfile();
      }
    } catch (err: any) {
      say(err?.message || 'Failed to confirm registration');
    } finally {
      setConfirmingAppId(null);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 px-4">
        <div className="p-8 pm-glass rounded-[28px] shadow-lg text-slate-800 dark:text-white space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-sky-400 grid place-items-center mx-auto mb-2 border border-blue-500/20">
            <FileText size={28} />
          </div>
          <h2 className="text-xl font-black tracking-tight">Sign in to View Your Applications</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Track your registrations, claim +10 Pixels on verified programs, and review feedback on submitted opportunities.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-600/20"
          >
            Sign In to Pixel Minds
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-2 sm:px-4 py-4 sm:py-6 space-y-6">
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

      {/* Top Header */}
      <div className="pm-glass rounded-[28px] p-5 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-sky-400 border border-blue-500/20 shadow-xs shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0e1b33] dark:text-white tracking-tight">
              Applications & Submissions
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Manage your opportunity registrations, claim Pixel rewards, and monitor submitted events.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/opportunities"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold pm-glass-control hover:bg-white/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition"
          >
            <span>Browse Opportunities</span>
            <ExternalLink size={12} />
          </Link>
          <Link
            to="/submit"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
          >
            <Plus size={14} />
            <span>Submit Opportunity</span>
          </Link>
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-2">
        <button
          onClick={() => handleTabChange('applications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'applications'
              ? 'bg-[#0B1628] dark:bg-blue-600 text-white shadow-sm'
              : 'pm-glass-control text-slate-700 dark:text-slate-300 hover:text-blue-600'
          }`}
        >
          <FileText size={14} />
          <span>My Applications</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {userApplications.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('submissions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'submissions'
              ? 'bg-[#0B1628] dark:bg-blue-600 text-white shadow-sm'
              : 'pm-glass-control text-slate-700 dark:text-slate-300 hover:text-blue-600'
          }`}
        >
          <Send size={14} />
          <span>My Submissions</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {rawSubmissions.length}
          </span>
        </button>
      </div>

      {/* Tab 1: My Registered Applications */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl pm-glass-card p-3.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Applied</p>
              <p className="font-extrabold text-[#0e1b33] dark:text-white text-lg mt-0.5">{userApplications.length}</p>
            </div>
            <div className="rounded-2xl pm-glass-card p-3.5">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Confirmed</p>
              <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-lg mt-0.5">
                {userApplications.filter((a) => a.status === 'confirmed').length}
              </p>
            </div>
            <div className="rounded-2xl pm-glass-card p-3.5">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Verifying</p>
              <p className="font-extrabold text-amber-600 dark:text-amber-400 text-lg mt-0.5">
                {userApplications.filter((a) => a.status === 'pending_confirmation').length}
              </p>
            </div>
            <div className="rounded-2xl pm-glass-card p-3.5">
              <p className="text-[10px] font-bold text-blue-600 dark:text-sky-400 uppercase tracking-wider">Pixels Claimed</p>
              <p className="font-extrabold text-blue-600 dark:text-sky-400 text-lg mt-0.5 flex items-center gap-1">
                <Sparkles size={14} />
                <span>+{userApplications.filter((a) => a.rewardClaimed).reduce((sum, a) => sum + (a.pixelsRewarded || 10), 0)}</span>
              </p>
            </div>
          </div>

          {loadingApps ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mb-3" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Loading your applications...</p>
            </div>
          ) : userApplications.length === 0 ? (
            <div className="text-center py-16 pm-glass-card rounded-[24px] p-8 space-y-3">
              <div className="w-14 h-14 bg-blue-500/10 text-blue-600 dark:text-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-blue-500/20">
                <FileText size={24} />
              </div>
              <h4 className="text-base font-bold text-[#16171D] dark:text-white">
                You haven't applied for any opportunities yet
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Browse hackathons, internships, and fellowships. Click "Apply on Official Site" to track your applications and unlock +10 Pixels per registration!
              </p>
              <Link
                to="/opportunities"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs mt-2"
              >
                Explore Opportunities
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {userApplications.map((app) => {
                const elapsedMs = Date.now() - app.appliedAt;
                const THREE_MINS_MS = 3 * 60 * 1000;
                const remainingSecs = Math.max(0, Math.ceil((THREE_MINS_MS - elapsedMs) / 1000));
                const isReadyToConfirm = app.status === 'pending_confirmation' && remainingSecs === 0;
                const isConfirmed = app.status === 'confirmed';

                return (
                  <div
                    key={app.id}
                    className="p-4 sm:p-5 pm-glass-card rounded-[20px] transition hover:shadow-md space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 text-[10px] font-bold border border-blue-500/20 uppercase">
                            {app.category}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {app.mode} · Deadline: {app.deadline}
                          </span>
                        </div>
                        <Link to={`/opportunities/${app.opportunityId}`} className="block">
                          <h4 className="font-bold text-sm sm:text-base text-[#0e1b33] dark:text-white hover:text-blue-600 transition truncate">
                            {app.opportunityTitle}
                          </h4>
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{app.organizer}</p>
                      </div>

                      {/* Status / Confirm Action */}
                      <div className="sm:text-right shrink-0 flex flex-col items-start sm:items-end gap-1.5">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                            <CheckCircle2 size={13} />
                            <span>Registered (+10 Pixels)</span>
                          </span>
                        ) : isReadyToConfirm ? (
                          <button
                            onClick={() => handleConfirmRegistration(app.id)}
                            disabled={confirmingAppId === app.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
                          >
                            <CheckCircle2 size={13} />
                            <span>{confirmingAppId === app.id ? 'Confirming...' : 'Confirm Registration & Claim +10'}</span>
                          </button>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-500/20">
                              <Clock size={13} className="animate-spin" />
                              <span>Verifying ({Math.floor(remainingSecs / 60)}m {remainingSecs % 60}s left)</span>
                            </span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[200px] text-left sm:text-right">
                              Confirmation unlocks once application period timer elapses.
                            </p>
                          </div>
                        )}

                        {app.officialUrl && (
                          <a
                            href={app.officialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-sky-400 hover:underline"
                          >
                            <span>Official Registration Portal</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Submitted Opportunities */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {loadingSubs ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mb-3" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Loading your submissions...</p>
            </div>
          ) : rawSubmissions.length === 0 ? (
            <div className="text-center py-16 pm-glass-card rounded-[24px] p-8 space-y-3">
              <div className="w-14 h-14 bg-blue-500/10 text-blue-600 dark:text-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-blue-500/20">
                <Send size={24} />
              </div>
              <h4 className="text-base font-bold text-[#16171D] dark:text-white">
                You haven't submitted any opportunities yet
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 max-w-sm mx-auto leading-relaxed">
                Know about a hackathon, internship, workshop, or tech event? Submit it for review to earn +50 Pixels!
              </p>
              <Link
                to="/submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
              >
                <Plus size={14} />
                <span>Submit an Opportunity</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {rawSubmissions.map((sub) => {
                const isPending = sub.status === 'pending';
                const isApproved = sub.status === 'approved' || sub.status === 'published';
                const isRejected = sub.status === 'rejected';

                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubForModal(sub)}
                    className="p-5 transition hover:shadow-md cursor-pointer space-y-3 pm-glass-card rounded-[20px]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-sky-400 border border-blue-500/20">
                            {sub.category}
                          </span>
                          {isPending && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              <Clock size={11} /> Pending Review
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 size={11} /> Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-400 border border-rose-500/20">
                              <XCircle size={11} /> Rejected
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-[#16171D] dark:text-white truncate hover:text-blue-600 transition">
                          {sub.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Organizer:{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {sub.organizer || 'Not specified'}
                          </span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Submitted:{' '}
                          {new Date(sub.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        {sub.updatedAt && sub.updatedAt !== sub.createdAt && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Updated:{' '}
                            {new Date(sub.updatedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Reviewer Feedback Callout */}
                    {sub.adminNotes && (
                      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs space-y-0.5">
                        <div className="flex items-center gap-1 font-bold text-[11px]">
                          <AlertCircle size={12} />
                          <span>Reviewer Feedback / Note:</span>
                        </div>
                        <p className="leading-relaxed pl-4 font-medium">{sub.adminNotes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedSubForModal && (
        <SubmissionDetailModal
          isOpen={Boolean(selectedSubForModal)}
          onClose={() => setSelectedSubForModal(null)}
          submission={selectedSubForModal}
        />
      )}
    </div>
  );
}
