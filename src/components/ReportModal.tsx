import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flag, X, CheckCircle2, AlertCircle, LogIn, ShieldAlert } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../store';
import { createReport } from '../services/reports';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'opportunity' | 'post';
  targetId: string;
  targetTitle: string;
  targetContent?: string;
  onReportSubmitted?: () => void;
}

const OPPORTUNITY_REASONS = [
  'Broken link or registration URL unreachable',
  'Opportunity expired or deadline passed',
  'Misleading or inaccurate details',
  'Suspected spam, scam, or unlisted fee',
  'Duplicate opportunity listing',
  'Other issue'
];

const POST_REASONS = [
  'Spam, advertisement or unrelated promotion',
  'Inappropriate, offensive, or abusive content',
  'Harassment or hate speech',
  'False or misleading information',
  'Broken link or malicious URL',
  'Other violation'
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  targetContent,
  onReportSubmitted
}) => {
  const { user, userProfile } = useAuth();
  const { say } = useApp();
  const location = useLocation();

  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalDetails, setAdditionalDetails] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [alreadyReported, setAlreadyReported] = useState(false);

  // Check if this item has already been reported by the current user
  useEffect(() => {
    if (isOpen && user?.uid && targetId) {
      const reportKey = `pm_reported_${targetId}_${user.uid}`;
      if (localStorage.getItem(reportKey) === 'true') {
        setAlreadyReported(true);
      } else {
        setAlreadyReported(false);
      }
    }
  }, [isOpen, user?.uid, targetId]);

  // Lock body scroll and listen for Escape key while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const reasons = targetType === 'opportunity' ? OPPORTUNITY_REASONS : POST_REASONS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!user?.uid) {
      setErrorMessage('You must be signed in to submit a report.');
      return;
    }

    if (!selectedReason) {
      setErrorMessage('Please select a reason for reporting.');
      return;
    }

    setSubmitting(true);
    try {
      await createReport({
        reporterId: user.uid,
        reporterName: userProfile?.displayName || user?.displayName || 'Community Member',
        reporterEmail: userProfile?.email || user?.email || '',
        targetType,
        targetId,
        targetTitle,
        targetContent,
        reason: selectedReason,
        details: additionalDetails.trim() || undefined
      });

      // Mark locally as reported to prevent repeated clicks
      const reportKey = `pm_reported_${targetId}_${user.uid}`;
      localStorage.setItem(reportKey, 'true');

      setSubmitted(true);
      say('Report submitted for review');
      if (onReportSubmitted) onReportSubmitted();

      setTimeout(() => {
        setSubmitted(false);
        setSelectedReason('');
        setAdditionalDetails('');
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('[ReportModal] Failed to submit report:', err);
      const msg = err?.message || 'Failed to submit report. Please try again.';
      setErrorMessage(msg);
      say(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3.5 sm:p-4 bg-black/65 backdrop-blur-sm transition-all"
      onClick={(e) => {
        // Close if clicking outside the modal box
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-[#0e1b33] border border-white/15 p-5 sm:p-6 shadow-2xl text-white transition-all transform animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
        >
          <X size={18} />
        </button>

        {/* 1. Logged-out Visitor State */}
        {!user ? (
          <div className="text-center py-6 sm:py-8 space-y-4">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert size={28} />
            </div>
            <div className="space-y-1.5 px-2">
              <h3 id="report-modal-title" className="text-lg font-bold text-white">
                Sign In Required to Report
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                To maintain community trust, verify claims, and prevent spam, you must be signed in with your Pixel Minds account to report this {targetType}.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-xs mx-auto">
              <Link
                to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
                onClick={onClose}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition active:scale-[0.98]"
              >
                <LogIn size={14} />
                <span>Sign in to Report</span>
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : submitted ? (
          /* 2. Success Feedback Screen */
          <div className="text-center py-8 space-y-3">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-1">
              <h3 id="report-modal-title" className="font-extrabold text-lg text-white">
                Report Received
              </h3>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                Thank you for keeping Pixel Minds authentic and safe. Our moderation team will review this {targetType} promptly.
              </p>
            </div>
          </div>
        ) : alreadyReported ? (
          /* 3. Already Reported Screen */
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <AlertCircle size={26} />
            </div>
            <div className="space-y-1 px-2">
              <h3 id="report-modal-title" className="font-bold text-base text-white">
                Already Reported
              </h3>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                You have already submitted a report for this {targetType}. Our moderators have been notified and are actively reviewing the item.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* 4. Active Reporting Form */
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 space-y-3.5">
            {/* Header info */}
            <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/25">
                <Flag size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 id="report-modal-title" className="font-bold text-base text-white truncate">
                  Report {targetType === 'opportunity' ? 'Opportunity' : 'Post'}
                </h3>
                <p className="text-[11px] text-slate-400 truncate">
                  {targetTitle || 'Reported Content'}
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Reasons List */}
            <div className="space-y-1.5 flex-1 min-h-0">
              <label className="block text-xs font-bold text-slate-300">
                Why are you reporting this {targetType}?
              </label>
              <div className="space-y-1.5 max-h-48 sm:max-h-52 overflow-y-auto pr-1 pm-scrollbar">
                {reasons.map((r) => {
                  const isChecked = selectedReason === r;
                  return (
                    <label
                      key={r}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${
                        isChecked
                          ? 'border-rose-500/80 bg-rose-500/15 text-white font-semibold shadow-xs'
                          : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="report_reason"
                        value={r}
                        checked={isChecked}
                        onChange={() => {
                          setSelectedReason(r);
                          setErrorMessage('');
                        }}
                        disabled={submitting}
                        className="mt-0.5 accent-rose-500 text-rose-500 focus:ring-rose-500"
                      />
                      <span className="leading-tight">{r}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Additional details textarea */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="report-details" className="font-semibold text-slate-300">
                  Additional context <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <span className="text-[10px] text-slate-500">
                  {additionalDetails.length}/500
                </span>
              </div>
              <textarea
                id="report-details"
                rows={2}
                maxLength={500}
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                disabled={submitting}
                placeholder="Explain what is incorrect, broken, or inappropriate..."
                className="w-full rounded-xl border border-white/10 bg-[#07101f] p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 transition resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedReason}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-[0.98] disabled:opacity-50 text-xs font-bold text-white shadow-md shadow-rose-900/30 transition cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Report</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
