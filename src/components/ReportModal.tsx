import React, { useState } from 'react';
import { Flag, X, CheckCircle2 } from 'lucide-react';
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
  'Suspected spam, scam, or paid fee without disclosure',
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
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalDetails, setAdditionalDetails] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const reasons = targetType === 'opportunity' ? OPPORTUNITY_REASONS : POST_REASONS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      say('Please select a reason for reporting');
      return;
    }

    setSubmitting(true);
    try {
      const finalReason = additionalDetails.trim()
        ? `${selectedReason}: ${additionalDetails.trim()}`
        : selectedReason;

      await createReport({
        reporterId: user?.uid || 'guest_reporter',
        reporterName: userProfile?.displayName || user?.displayName || 'Community Member',
        reporterEmail: userProfile?.email || user?.email || '',
        targetType,
        targetId,
        targetTitle,
        targetContent,
        reason: finalReason
      });

      setSubmitted(true);
      say('Report submitted for review');
      if (onReportSubmitted) onReportSubmitted();
      setTimeout(() => {
        setSubmitted(false);
        setSelectedReason('');
        setAdditionalDetails('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to submit report:', err);
      say('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl pm-glass-card bg-white/95 dark:bg-[#11243D] border border-white/90 dark:border-white/10 p-6 shadow-2xl text-[#0e1b33] dark:text-white">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 size={48} className="mx-auto text-emerald-500 animate-bounce" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Report Received</h3>
            <p className="text-xs text-slate-500 dark:text-slate-300 max-w-xs mx-auto">
              Thank you for keeping Pixel Minds safe. Our moderation team will review this {targetType} promptly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/70 dark:border-white/10">
              <span className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <Flag size={18} />
              </span>
              <div>
                <h3 className="font-bold text-base text-[#0e1b33] dark:text-white">
                  Report {targetType === 'opportunity' ? 'Opportunity' : 'Post'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                  {targetTitle}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Why are you reporting this {targetType}?
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {reasons.map((r) => (
                  <label
                    key={r}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      selectedReason === r
                        ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 font-semibold'
                        : 'border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      value={r}
                      checked={selectedReason === r}
                      onChange={() => setSelectedReason(r)}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Additional context (optional)
              </label>
              <textarea
                rows={2}
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="Describe what's wrong with this item..."
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20 p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-rose-400 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedReason}
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-xs font-bold text-white shadow-sm transition cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

