import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Calendar,
  MapPin,
  Trophy,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  AlertCircle,
  User,
  Mail,
  FileText
} from 'lucide-react';
import type { Opportunity } from '../types';

interface SubmissionDetailModalProps {
  submission: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string, reason?: string) => Promise<void>;
}

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  submission,
  isOpen,
  onClose,
  isAdmin = false,
  onApprove,
  onReject
}) => {
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !submission) return null;

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Not provided';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return 'Not provided';
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
            <XCircle size={13} />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
            <Clock size={13} />
            Pending Review
          </span>
        );
    }
  };

  const handleApproveClick = async () => {
    if (!onApprove) return;
    setIsSubmitting(true);
    try {
      await onApprove(submission.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!onReject) return;
    setIsSubmitting(true);
    try {
      await onReject(submission.id, rejectionReason.trim() || undefined);
      setRejecting(false);
      setRejectionReason('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl my-8 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="space-y-1.5 pr-6 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-700 border border-sky-100">
                {submission.category}
              </span>
              {getStatusBadge(submission.status)}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight break-words">
              {submission.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Submitted on {formatDateTime(submission.createdAt)}
              {submission.updatedAt && submission.updatedAt !== submission.createdAt && (
                <span className="ml-2 text-slate-400">
                  (Updated {formatDateTime(submission.updatedAt)})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-700">
          {/* Submitter Info (Visible to Admins) */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-sky-100 text-sky-700 font-bold">
                  <User size={15} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">
                    {submission.submitterName || 'Registered User'}
                  </p>
                  <p className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                    <Mail size={11} className="inline text-slate-400" />
                    {submission.submitterEmail || submission.createdBy || 'No email available'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-sky-700 bg-white px-2.5 py-1 rounded-lg border border-sky-200">
                Submitter ID: {submission.createdBy.substring(0, 8)}...
              </span>
            </div>
          )}

          {/* Banner Image if uploaded */}
          {submission.imageUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-56 bg-slate-100">
              <img
                src={submission.imageUrl}
                alt={submission.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          ) : null}

          {/* Rejection / Reviewer Notes Callout if rejected */}
          {submission.adminNotes && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800">
                <AlertCircle size={15} />
                <span>Reviewer Feedback / Rejection Reason:</span>
              </div>
              <p className="text-xs leading-relaxed pl-5 font-medium">
                {submission.adminNotes}
              </p>
            </div>
          )}

          {/* Core Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase size={12} className="text-sky-500" /> Organizer / Company
              </span>
              <p className="font-bold text-slate-900">{submission.organizer || 'Not provided'}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={12} className="text-sky-500" /> Application Deadline
              </span>
              <p className="font-bold text-slate-900">{formatDate(submission.deadline)}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={12} className="text-sky-500" /> Mode &amp; Location
              </span>
              <p className="font-bold text-slate-900 capitalize">
                {submission.mode} {submission.location ? `(${submission.location})` : ''}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy size={12} className="text-amber-500" /> Prize / Reward / Stipend
              </span>
              <p className="font-bold text-slate-900">
                {submission.prize || submission.stipend || 'Not provided'}
              </p>
            </div>

            {submission.eligibility && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Eligibility
                </span>
                <p className="font-medium text-slate-800">{submission.eligibility}</p>
              </div>
            )}

            {submission.teamSize && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={12} className="text-indigo-500" /> Team Size
                </span>
                <p className="font-medium text-slate-800">{submission.teamSize}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText size={13} /> Description
            </h4>
            <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {submission.description || 'No description provided.'}
            </div>
          </div>

          {/* Skills / Tags */}
          {submission.skills && submission.skills.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Skills &amp; Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {submission.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          {submission.additionalInfo && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Additional Information
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {submission.additionalInfo}
              </div>
            </div>
          )}

          {/* Official URL */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Official Submission URL
              </p>
              <p className="text-xs text-slate-800 font-mono truncate mt-0.5">
                {submission.officialUrl || 'Not provided'}
              </p>
            </div>
            {submission.officialUrl && (
              <a
                href={submission.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition shadow-xs"
              >
                <span>Open URL</span>
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>

        {/* Rejection Reason Form (when Reject is clicked in Admin view) */}
        {rejecting && (
          <div className="p-5 border-t border-rose-100 bg-rose-50/50 space-y-3 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-rose-900">
                Rejection Reason (Optional Feedback for Submitter)
              </h4>
              <button
                onClick={() => setRejecting(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Official URL is unreachable, or eligibility criteria does not match tech opportunities..."
              className="w-full rounded-xl border border-rose-200 bg-white p-3 text-xs outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejecting(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!rejecting && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2">
              {submission.status === 'published' || (submission.status as string) === 'approved' ? (
                <a
                  href={`/opportunities/${submission.opportunityId || submission.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition"
                >
                  <CheckCircle2 size={13} />
                  <span>View Live Opportunity</span>
                  <ExternalLink size={11} />
                </a>
              ) : null}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
              >
                Close
              </button>

              {isAdmin && submission.status === 'pending' && (
                <>
                  <button
                    onClick={() => setRejecting(true)}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleApproveClick}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? 'Approving...' : 'Approve & Publish'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
