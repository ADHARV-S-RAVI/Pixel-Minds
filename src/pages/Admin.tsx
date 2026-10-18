import { useState, useEffect } from 'react';
import { getAllOpportunities, getPendingSubmissions, updateOpportunityAdmin, deleteOpportunityAdmin } from '../services/opportunities';
import type { Opportunity } from '../types';
import { LayoutDashboard, FileText, Inbox, Users, BarChart3, Settings, Search, Trash2, Check, X, Eye } from 'lucide-react';
import { SubmissionDetailModal } from '../components/SubmissionDetailModal';

type AdminTab = 'overview' | 'opportunities' | 'submissions' | 'users' | 'reports' | 'settings';

const STATUS_OPTIONS = ['pending', 'published', 'rejected', 'archived', 'expired', 'draft'];

export function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('submissions');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [submissions, setSubmissions] = useState<Opportunity[]>([]);
  const [selectedSubmissionForDetails, setSelectedSubmissionForDetails] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'opportunities') {
        const data = await getAllOpportunities();
        setOpportunities(data);
      } else if (activeTab === 'submissions') {
        const data = await getPendingSubmissions();
        setSubmissions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleApprove = async (id: string) => {
    if (!window.confirm('Approve and publish this opportunity?')) return;
    try {
      await updateOpportunityAdmin(id, { status: 'published' });
      fetchData();
    } catch (err) {
      console.error('Failed to approve', err);
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    const finalReason = reason !== undefined ? reason : window.prompt('Rejection reason (optional):');
    if (finalReason === null) return;
    try {
      await updateOpportunityAdmin(id, { status: 'rejected', rejectionReason: finalReason || undefined, adminNotes: finalReason || undefined });
      fetchData();
    } catch (err) {
      console.error('Failed to reject', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this opportunity? This cannot be undone.')) return;
    try {
      await deleteOpportunityAdmin(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!window.confirm(`Change status to "${newStatus}"?`)) return;
    try {
      await updateOpportunityAdmin(id, { status: newStatus as any });
      fetchData();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };



  const sidebarItems: { id: AdminTab; label: string; icon: any; disabled?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, disabled: true },
    { id: 'submissions', label: 'Submissions', icon: Inbox },
    { id: 'opportunities', label: 'Opportunities', icon: FileText },
    { id: 'users', label: 'Users', icon: Users, disabled: true },
    { id: 'reports', label: 'Reports', icon: BarChart3, disabled: true },
    { id: 'settings', label: 'Settings', icon: Settings, disabled: true },
  ];

  const filteredOpportunities = opportunities.filter(opp => {
    const matchSearch = !searchQuery || opp.title.toLowerCase().includes(searchQuery.toLowerCase()) || opp.organizer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || opp.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Dashboard</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-56 flex-shrink-0">
            <nav className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => !item.disabled && setActiveTab(item.id)}
                    disabled={item.disabled}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors border-b border-slate-100 last:border-b-0 ${
                      activeTab === item.id
                        ? 'bg-sky-50 text-sky-700 border-l-2 border-l-sky-500'
                        : item.disabled
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                    {item.id === 'submissions' && submissions.length > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{submissions.length}</span>
                    )}
                    {item.disabled && <span className="ml-auto text-xs text-slate-300">Soon</span>}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[500px]">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                </div>
              ) : (
                <>
                  {/* Submissions Tab */}
                  {activeTab === 'submissions' && (
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-slate-900">
                          Pending Submissions
                          <span className="ml-2 text-sm text-slate-400 font-normal">({submissions.length})</span>
                        </h2>
                      </div>
                      {submissions.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Inbox className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-slate-500 text-sm">No pending submissions to review.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {submissions.map((sub) => (
                            <div key={sub.id} className="border border-slate-200 rounded-xl p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-slate-900 text-sm">{sub.title}</h4>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {sub.category} · by {sub.organizer} · Submitted {new Date(sub.createdAt).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1">Creator: {sub.createdBy}</p>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  <button onClick={() => setSelectedSubmissionForDetails(sub)} className="inline-flex items-center space-x-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors" title="View Details">
                                    <Eye size={13} />
                                    <span>View Details</span>
                                  </button>
                                  <button onClick={() => handleApprove(sub.id)} className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors" title="Approve">
                                    <Check size={14} />
                                    <span>Approve</span>
                                  </button>
                                  <button onClick={() => handleReject(sub.id)} className="inline-flex items-center space-x-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors" title="Reject">
                                    <X size={14} />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Opportunities Tab */}
                  {activeTab === 'opportunities' && (
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <h2 className="text-lg font-semibold text-slate-900">All Opportunities</h2>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search..."
                              className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                            />
                          </div>
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-slate-200 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="all">All statuses</option>
                            {STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {filteredOpportunities.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-slate-500 text-sm">No opportunities found.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Title</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Stats</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredOpportunities.map((opp) => (
                                <tr key={opp.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="text-sm font-medium text-slate-900">{opp.title}</div>
                                    <div className="text-xs text-slate-500">{opp.category} · {opp.organizer}</div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <select
                                      value={opp.status}
                                      onChange={(e) => handleStatusChange(opp.id, e.target.value)}
                                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                                    >
                                      {STATUS_OPTIONS.map(s => (
                                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-3 px-4 hidden sm:table-cell">
                                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                                      <span className="inline-flex items-center"><Eye size={12} className="mr-1" />{opp.views}</span>
                                      <span>{opp.applyClicks} clicks</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button onClick={() => handleDelete(opp.id)} className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Placeholder Tabs */}
                  {['overview', 'users', 'reports', 'settings'].includes(activeTab) && (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Settings className="w-5 h-5 text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} — Coming soon</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submission Detail Modal */}
      <SubmissionDetailModal
        submission={selectedSubmissionForDetails}
        isOpen={!!selectedSubmissionForDetails}
        onClose={() => setSelectedSubmissionForDetails(null)}
        isAdmin
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}