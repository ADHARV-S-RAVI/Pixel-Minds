import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Calendar,
  MapPin,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  AlertCircle,
  User,
  Mail
} from 'lucide-react';
import type { Opportunity } from '../types';
import { parseOpportunityImages } from '../services/storage';

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
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);

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
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 size={13} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-300 border border-rose-500/30">
            <XCircle size={13} />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-500/30">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl my-8 bg-[#11243D]/95 backdrop-blur-2xl text-white rounded-3xl shadow-2xl border border-sky-500/20 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10 bg-white/5">
          <div className="space-y-1.5 pr-6 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#DFB76C]/15 border border-[#DFB76C]/30 px-3 py-0.5 text-xs font-bold text-[#DFB76C]">
                {submission.category}
              </span>
              {getStatusBadge(submission.status)}
            </div>
            <h2 className="text-xl font-extrabold text-white leading-tight break-words">
              {submission.title}
            </h2>
            <p className="text-xs text-zinc-400 font-medium">
              Submitted on {formatDateTime(submission.createdAt)}
              {submission.updatedAt && submission.updatedAt !== submission.createdAt && (
                <span className="ml-2 text-zinc-500">
                  (Updated {formatDateTime(submission.updatedAt)})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-zinc-300">
          {/* Submitter Info (Visible to Admins) */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#DFB76C]/20 text-[#DFB76C] font-bold">
                  <User size={15} />
                </div>
                <div>
                  <p className="font-bold text-white">
                    {submission.submitterName || 'Registered User'}
                  </p>
                  <p className="text-zinc-400 font-mono text-[11px] flex items-center gap-1">
                    <Mail size={11} className="inline text-zinc-500" />
                    {submission.submitterEmail || submission.createdBy || 'No email available'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#DFB76C] bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                Submitter ID: {submission.createdBy.substring(0, 8)}...
              </span>
            </div>
          )}

          {/* Banner Images if uploaded */}
          {(() => {
            const images = parseOpportunityImages(submission.imageUrl);
            if (images.length === 0) return null;
            return (
              <div className="space-y-2">
                <div className="rounded-2xl overflow-hidden border border-white/10 max-h-64 bg-zinc-900">
                  <img
                    src={images[selectedImgIdx] || images[0]}
                    alt={submission.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImgIdx(idx)}
                        className={`relative w-16 h-12 rounded-lg overflow-hidden border transition-all shrink-0 cursor-pointer ${
                          selectedImgIdx === idx ? 'border-[#DFB76C] ring-1 ring-[#DFB76C]' : 'border-white/20 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Key Facts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                <Calendar size={12} className="text-[#DFB76C]" /> Deadline
              </span>
              <p className="font-bold text-white mt-1">
                {formatDate(submission.deadline)}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                <MapPin size={12} className="text-[#DFB76C]" /> Mode
              </span>
              <p className="font-bold text-white capitalize mt-1">
                {submission.mode || 'Online'}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                <Briefcase size={12} className="text-[#DFB76C]" /> Organizer
              </span>
              <p className="font-bold text-white truncate mt-1">
                {submission.organizer || 'Not specified'}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                <Trophy size={12} className="text-[#DFB76C]" /> Prize / Reward
              </span>
              <p className="font-bold text-white truncate mt-1">
                {submission.prize || 'Certificate'}
              </p>
            </div>
          </div>

          {/* Official Link */}
          {submission.officialUrl && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Official Application Link
                </p>
                <p className="text-xs text-white truncate font-mono mt-0.5">
                  {submission.officialUrl}
                </p>
              </div>
              <a
                href={submission.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition shrink-0"
              >
                <span>Visit Link</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Description
            </h4>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
              {submission.description || 'No description provided.'}
            </div>
          </div>

          {/* Skills Required */}
          {submission.skills && submission.skills.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Target Tech Skills
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {submission.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-white/8 border border-white/10 text-xs font-medium text-zinc-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rejection Feedback (if previously rejected) */}
          {submission.status === 'rejected' && (submission.adminNotes || (submission as any).rejectionReason) && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              <p className="font-bold flex items-center gap-1.5 mb-1 text-rose-300">
                <AlertCircle size={14} />
                Rejection Reviewer Feedback
              </p>
              <p className="leading-relaxed">{submission.adminNotes || (submission as any).rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Rejection Reason Form (when Reject is clicked in Admin view) */}
        {rejecting && (
          <div className="p-5 border-t border-rose-500/20 bg-rose-500/10 space-y-3 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-rose-300">
                Rejection Reason (Optional Feedback for Submitter)
              </h4>
              <button
                onClick={() => setRejecting(false)}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Official URL is unreachable, or eligibility criteria does not match tech opportunities..."
              className="w-full rounded-xl border border-rose-500/30 bg-black/40 p-3 text-xs outline-none text-white focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejecting(false)}
                className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 text-xs font-semibold text-zinc-300 hover:bg-white/10 cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!rejecting && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              {submission.status === 'published' || (submission.status as string) === 'approved' ? (
                <a
                  href={`/opportunities/${submission.opportunityId || submission.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold transition"
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
                className="px-4 py-2 rounded-full border border-white/15 bg-white/10 hover:bg-white/15 text-xs font-semibold text-zinc-200 transition cursor-pointer"
              >
                Close
              </button>

              {isAdmin && submission.status === 'pending' && (
                <>
                  <button
                    onClick={() => setRejecting(true)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-full border border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleApproveClick}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-[#C5A059] to-[#DFB76C] hover:brightness-105 text-zinc-950 text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
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
