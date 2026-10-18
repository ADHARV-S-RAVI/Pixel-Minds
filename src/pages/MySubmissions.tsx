import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserSubmissions } from '../services/opportunities';
import type { Opportunity } from '../types';
import { Link } from 'react-router-dom';
import { FileText, Plus, ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { SubmissionDetailModal } from '../components/SubmissionDetailModal';

export function MySubmissions() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<Opportunity | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (user?.uid) {
        try {
          const data = await getUserSubmissions(user.uid);
          setSubmissions(data);
        } catch (err) {
          console.error('Failed to fetch submissions', err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchSubmissions();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} /> Pending Review
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="h-8 skeleton w-48 mb-6"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Submissions</h1>
              <p className="mt-1 text-slate-500 text-sm">Track the status of your submitted opportunities.</p>
            </div>
            <Link
              to="/submit"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <Plus size={16} />
              <span>Submit New</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {submissions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No submissions yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              You haven't submitted any opportunities yet. Share something with the community!
            </p>
            <Link
              to="/submit"
              className="inline-flex items-center px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              Submit your first opportunity
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                onClick={() => setSelectedSub(sub)}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-300 hover:shadow-xs transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(sub.status)}
                      <span className="text-xs text-slate-400">{sub.category}</span>
                    </div>
                    <h4 className="text-base font-semibold text-slate-900 truncate hover:text-sky-600 transition">
                      {sub.title}
                    </h4>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Submitted on{' '}
                      {new Date(sub.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  {sub.status === 'published' && (
                    <Link
                      to={`/opportunities/${sub.opportunityId || sub.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center space-x-1 text-sky-600 hover:text-sky-700 text-sm font-medium flex-shrink-0"
                    >
                      <span>View Live</span>
                      <ExternalLink size={14} />
                    </Link>
                  )}
                </div>

                {sub.adminNotes && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-900 text-xs space-y-0.5">
                    <div className="flex items-center gap-1 font-bold text-[11px] text-rose-800">
                      <AlertCircle size={12} />
                      <span>Reviewer Feedback:</span>
                    </div>
                    <p className="leading-relaxed pl-4">{sub.adminNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <SubmissionDetailModal
        submission={selectedSub}
        isOpen={!!selectedSub}
        onClose={() => setSelectedSub(null)}
      />
    </div>
  );
}
