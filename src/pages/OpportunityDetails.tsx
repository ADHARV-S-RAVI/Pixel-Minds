import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getOpportunityById, incrementOpportunityViews, incrementApplyClicks, recordOpportunityShare } from '../services/opportunities';
import { parseOpportunityImages } from '../services/storage';
import type { Opportunity } from '../types';
import { Calendar, MapPin, Trophy, Users, ArrowUpRight, Share2, Eye, ArrowLeft, Clock, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function OpportunityDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);

  useEffect(() => {
    const fetchOpp = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const opp = await getOpportunityById(id);
        if (opp && opp.status === 'published') {
          setOpportunity(opp);
          await incrementOpportunityViews(id);
        } else {
          setError('Opportunity not found or is unavailable.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load opportunity details.');
      } finally {
        setLoading(false);
      }
    };
    fetchOpp();
  }, [id]);

  const handleApply = async () => {
    if (id && opportunity?.officialUrl) {
      await incrementApplyClicks(id);
      window.open(opportunity.officialUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = async () => {
    if (currentUser?.uid && opportunity?.id) {
      await recordOpportunityShare(currentUser.uid, opportunity.id);
    }
    const shareUrl = window.location.href;
    const shareData = {
      title: opportunity?.title || 'Pixel Minds Opportunity',
      text: `Check out this ${opportunity?.category || 'opportunity'} on Pixel Minds!`,
      url: shareUrl,
    };

    if (navigator.share) {
      navigator.share(shareData).catch((err) => {
        if (err.name !== 'AbortError') console.warn('Share error:', err);
      });
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Opportunity link copied to clipboard!');
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Opportunity link copied to clipboard!');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-8 skeleton w-48 mb-6"></div>
        <div className="h-64 skeleton rounded-xl mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 skeleton w-3/4"></div>
            <div className="h-4 skeleton w-1/3"></div>
            <div className="h-4 skeleton w-full"></div>
            <div className="h-4 skeleton w-full"></div>
            <div className="h-4 skeleton w-2/3"></div>
          </div>
          <div className="h-80 skeleton rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Globe className="w-7 h-7 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Opportunity Not Found</h2>
        <p className="text-slate-500 mb-6">{error || 'This opportunity may have been removed or is no longer available.'}</p>
        <button onClick={() => navigate('/opportunities')} className="px-5 py-2.5 bg-sky-500 text-white rounded-xl font-medium text-sm hover:bg-sky-600 transition-colors">
          Back to Opportunities
        </button>
      </div>
    );
  }

  const daysLeft = Math.ceil((opportunity.deadline - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link to="/opportunities" className="inline-flex items-center text-sm text-slate-500 hover:text-sky-600 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Opportunities
        </Link>

        {/* Banner & Multiple Images */}
        {(() => {
          const images = parseOpportunityImages(opportunity.imageUrl);
          return (
            <div className="mb-8">
              <div className="w-full h-56 sm:h-72 lg:h-80 bg-slate-100 rounded-2xl overflow-hidden relative">
                {images.length > 0 ? (
                  <img src={images[selectedImgIdx] || images[0]} alt={opportunity.title} className="w-full h-full object-cover transition-all duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100">
                    <span className="text-sky-200 text-5xl font-bold">{opportunity.category}</span>
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex items-center gap-2.5 mt-3 overflow-x-auto pb-1">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImgIdx(idx)}
                      className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        selectedImgIdx === idx ? 'border-sky-500 shadow-md ring-2 ring-sky-500/30' : 'border-slate-200 opacity-70 hover:opacity-100'
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <span className="bg-sky-50 text-sky-700 px-3 py-1 rounded-md text-sm font-medium border border-sky-100">
                  {opportunity.category}
                </span>
                <span className="flex items-center text-slate-400 text-sm">
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  {(opportunity.views || 0) + 1} views
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2">
                {opportunity.title}
              </h1>
              <p className="text-base text-slate-500">
                by <span className="text-slate-700 font-medium">{opportunity.organizer}</span>
              </p>
            </div>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">About this opportunity</h2>
              <div className="text-slate-600 leading-relaxed space-y-3">
                {opportunity.description.split('\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </section>

            {opportunity.eligibility && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">Eligibility</h2>
                <p className="text-slate-600 leading-relaxed">{opportunity.eligibility}</p>
              </section>
            )}

            {opportunity.skills && opportunity.skills.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">Skills & Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {opportunity.skills.map((skill, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm sticky top-24">
              <div className="space-y-5">
                {daysLeft > 0 ? (
                  <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3 text-center">
                    <p className="text-sky-600 font-bold text-lg">{daysLeft} days left</p>
                    <p className="text-sky-500 text-xs">to apply</p>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
                    <p className="text-red-600 font-bold text-sm">Deadline passed</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-4 h-4 mt-0.5 text-sky-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Deadline</p>
                      <p className="text-sm text-slate-700 font-medium">{new Date(opportunity.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <MapPin className="w-4 h-4 mt-0.5 text-sky-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Mode</p>
                      <p className="text-sm text-slate-700 font-medium capitalize">{opportunity.mode}{opportunity.location ? ` · ${opportunity.location}` : ''}</p>
                    </div>
                  </div>

                  {opportunity.prize && (
                    <div className="flex items-start space-x-3">
                      <Trophy className="w-4 h-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Prize</p>
                        <p className="text-sm text-emerald-600 font-semibold">{opportunity.prize}</p>
                      </div>
                    </div>
                  )}

                  {opportunity.teamSize && (
                    <div className="flex items-start space-x-3">
                      <Users className="w-4 h-4 mt-0.5 text-sky-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Team Size</p>
                        <p className="text-sm text-slate-700 font-medium">{opportunity.teamSize}</p>
                      </div>
                    </div>
                  )}

                  {opportunity.startDate && (
                    <div className="flex items-start space-x-3">
                      <Clock className="w-4 h-4 mt-0.5 text-sky-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Event Dates</p>
                        <p className="text-sm text-slate-700 font-medium">
                          {new Date(opportunity.startDate).toLocaleDateString()} – {new Date(opportunity.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
                <button
                  onClick={handleApply}
                  className="w-full flex items-center justify-center space-x-2 bg-sky-500 hover:bg-sky-600 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md"
                >
                  <span>Apply on Official Site</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-5 py-3 rounded-xl font-medium text-sm transition-colors border border-slate-200"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share{currentUser ? ' & Earn Pixels' : ''}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}