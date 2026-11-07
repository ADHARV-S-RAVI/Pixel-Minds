import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublishedOpportunities } from '../services/opportunities';
import { getPrimaryImageUrl } from '../services/storage';
import type { Opportunity } from '../types';
import { Search, MapPin, Calendar, Trophy, ArrowRight } from 'lucide-react';

const CATEGORIES = ['All', 'Hackathon', 'Tech Event', 'Workshop', 'Internship', 'Competition', 'Scholarship', 'Course', 'Startup Program', 'Conference', 'Other'];

export function Opportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [lastDoc, setLastDoc] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchOpportunities = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError('');

      const res = await getPublishedOpportunities(
        isLoadMore ? lastDoc : undefined,
        12,
        category,
        search
      );

      if (isLoadMore) {
        setOpportunities(prev => [...prev, ...res.opportunities]);
      } else {
        setOpportunities(res.opportunities);
      }

      setLastDoc(res.lastDoc);
      setHasMore(res.opportunities.length === 12);
    } catch (err) {
      console.error(err);
      setError('Failed to load opportunities. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [category, search]);

  const getDeadlineColor = (deadline: number) => {
    const daysLeft = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) return 'text-red-500';
    if (daysLeft <= 7) return 'text-amber-500';
    return 'text-slate-500';
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-bold text-slate-900">Discover Opportunities</h1>
          <p className="text-slate-500 mt-2 text-base">Find your next hackathon, internship, workshop, or competition.</p>

          {/* Search */}
          <div className="mt-6 max-w-2xl">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition-shadow shadow-sm focus:shadow-md"
                placeholder="Search opportunities, organizers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category filters */}
          <div className="mt-5 flex overflow-x-auto pb-1 space-x-2 scrollbar-hide">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  category === c
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-300 hover:text-sky-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="h-44 skeleton"></div>
                <div className="p-5 space-y-3">
                  <div className="h-4 skeleton w-1/4"></div>
                  <div className="h-5 skeleton w-3/4"></div>
                  <div className="h-4 skeleton w-1/2"></div>
                  <div className="h-4 skeleton w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No opportunities found</h3>
            <p className="mt-2 text-slate-500 text-sm max-w-sm mx-auto">Try adjusting your search or category filters to find what you're looking for.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {opportunities.map(opp => (
                <Link
                  key={opp.id}
                  to={`/opportunities/${opp.id}`}
                  className="group bg-white rounded-xl border border-slate-200 hover:border-sky-200 overflow-hidden transition-all hover:shadow-lg"
                >
                  {/* Image */}
                  <div className="h-44 bg-slate-100 relative overflow-hidden">
                    {getPrimaryImageUrl(opp.imageUrl) ? (
                      <img src={getPrimaryImageUrl(opp.imageUrl)} alt={opp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100">
                        <span className="text-sky-300 text-sm font-medium">{opp.category}</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 backdrop-blur-sm text-sky-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-sky-100">
                        {opp.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-semibold text-slate-900 text-base mb-1 group-hover:text-sky-600 transition-colors line-clamp-2 leading-snug">
                      {opp.title}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">{opp.organizer}</p>

                    <div className="space-y-1.5">
                      <div className={`flex items-center text-sm ${getDeadlineColor(opp.deadline)}`}>
                        <Calendar className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                        <span>Deadline: {new Date(opp.deadline).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm text-slate-500">
                        <MapPin className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                        <span>{opp.mode === 'online' ? 'Online' : opp.location || 'TBA'}</span>
                      </div>
                      {opp.prize && (
                        <div className="flex items-center text-sm text-emerald-600 font-medium">
                          <Trophy className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                          <span>{opp.prize}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <span className="text-sky-600 text-sm font-medium group-hover:text-sky-700 inline-flex items-center">
                        View Details
                        <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={() => fetchOpportunities(true)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-white border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-sky-600 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="inline-flex items-center space-x-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-500"></span>
                      <span>Loading...</span>
                    </span>
                  ) : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}