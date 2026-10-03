import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserSubmissions } from '../services/opportunities';
import type { Opportunity } from '../types';
import { Link } from 'react-router-dom';
import { FileText, Plus, ExternalLink } from 'lucide-react';

export function MySubmissions() {
  const { currentUser } = useAuth();
  const [submissions, setSubmissions] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (currentUser) {
        try {
          const data = await getUserSubmissions(currentUser.uid);
          setSubmissions(data);
        } catch (err) {
          console.error('Failed to fetch submissions', err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchSubmissions();
  }, [currentUser]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
      archived: 'bg-slate-100 text-slate-600 border-slate-200',
      expired: 'bg-slate-100 text-slate-500 border-slate-200',
      draft: 'bg-sky-50 text-sky-700 border-sky-200',
    };
    return (
      <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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
            <Link to="/submit" className="inline-flex items-center space-x-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
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
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">You haven't submitted any opportunities yet. Share something with the community!</p>
            <Link to="/submit" className="inline-flex items-center px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
              Submit your first opportunity
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div key={sub.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-200 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(sub.status)}
                      <span className="text-xs text-slate-400">{sub.category}</span>
                    </div>
                    <h4 className="text-base font-semibold text-slate-900 truncate">{sub.title}</h4>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Submitted on {new Date(sub.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  {sub.status === 'published' && (
                    <Link to={`/opportunities/${sub.id}`} className="inline-flex items-center space-x-1 text-sky-600 hover:text-sky-700 text-sm font-medium flex-shrink-0">
                      <span>View</span>
                      <ExternalLink size={14} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
