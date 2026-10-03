import { Link } from 'react-router-dom';
import { ArrowRight, Search, Trophy, Users, Zap, Globe } from 'lucide-react';

export function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-50 rounded-full -translate-y-1/2 translate-x-1/4"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-sky-50/60 rounded-full translate-y-1/2 -translate-x-1/4"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-sky-50 text-sky-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-sky-100">
              <Zap size={14} />
              <span>800+ community members and growing</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
              Discover opportunities.{' '}
              <span className="text-sky-500">Build your future.</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Find hackathons, internships, workshops, scholarships, competitions and more — all in one place. Curated by the community, for the community.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Link
                to="/opportunities"
                className="inline-flex items-center justify-center space-x-2 bg-sky-500 hover:bg-sky-600 text-white px-7 py-3.5 rounded-xl text-base font-semibold transition-all shadow-sm hover:shadow-md"
              >
                <Search size={18} />
                <span>Explore Opportunities</span>
              </Link>
              <Link
                to="/submit"
                className="inline-flex items-center justify-center space-x-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-7 py-3.5 rounded-xl text-base font-semibold transition-all hover:bg-slate-50"
              >
                <span>Share an Opportunity</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features / Categories */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Everything you need in one platform
            </h2>
            <p className="mt-3 text-slate-500 text-lg max-w-xl mx-auto">
              Pixel Minds aggregates the best tech opportunities so you never miss out.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Trophy size={22} />, title: 'Hackathons', desc: 'Build, compete, and win at top-tier coding competitions.' },
              { icon: <Users size={22} />, title: 'Internships', desc: 'Land your next role at startups and tech giants.' },
              { icon: <Globe size={22} />, title: 'Conferences', desc: 'Attend events and connect with industry leaders.' },
              { icon: <Zap size={22} />, title: 'Scholarships', desc: 'Unlock funding for your education and growth.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 hover:border-sky-200 hover:shadow-md transition-all group">
                <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-sky-100 transition-colors">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-slate-900 text-lg mb-1">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">How Pixel Minds works</h2>
            <p className="mt-3 text-slate-500 text-lg">Discover. Share. Earn Pixels.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Discover', desc: 'Browse curated tech opportunities from across the internet.' },
              { step: '02', title: 'Share', desc: 'Submit opportunities you find and help the community grow.' },
              { step: '03', title: 'Earn Pixels', desc: 'Get rewarded with Pixels for your contributions and climb the leaderboard.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-extrabold text-sky-200 mb-3">{item.step}</div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sky-50 border-t border-sky-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-slate-500 text-lg mb-8">
            Join 800+ tech enthusiasts already using Pixel Minds.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center bg-sky-500 hover:bg-sky-600 text-white px-7 py-3.5 rounded-xl text-base font-semibold transition-all shadow-sm hover:shadow-md"
            >
              Create Free Account
            </Link>
            <Link
              to="/opportunities"
              className="inline-flex items-center justify-center bg-white border border-slate-200 text-slate-700 px-7 py-3.5 rounded-xl text-base font-semibold transition-all hover:bg-slate-50"
            >
              Browse Opportunities
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}