import React, { useState } from 'react';
import { Mail, ChevronDown, HelpCircle, Check, Copy, Sparkles, MessageCircleQuestion } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'what-is-pixel-minds',
    category: 'General',
    question: 'What is Pixel Minds?',
    answer:
      'Pixel Minds is a centralized opportunity discovery platform for students, developers, and tech builders. We curate, verify, and track hackathons, internships, coding competitions, scholarships, tech events, and fellowship programs across the global tech ecosystem.'
  },
  {
    id: 'how-are-opportunities-verified',
    category: 'Platform',
    question: 'How are opportunities verified on Pixel Minds?',
    answer:
      'Every opportunity is thoroughly vetted by our team for authentic organizers, legitimate registration links, clear eligibility terms, and verified prize pools or stipends before it receives a verified badge and goes live on the platform.'
  },
  {
    id: 'what-are-pixels',
    category: 'Rewards',
    question: 'What are Pixels and what can I do with them?',
    answer:
      'Pixels are platform reputation points earned through active participation: signing up (+25), referring fellow builders (+25 per signup), and submitting new verified tech opportunities (+50). Pixels elevate your standing on the community Leaderboard and unlock exclusive profile badges.'
  },
  {
    id: 'how-to-submit-opportunity',
    category: 'Submissions',
    question: 'How do I share or submit a new tech opportunity?',
    answer:
      'Click the "+ Share Opportunity" button in the navigation bar or top header. Fill in the event title, category, official registration link, deadline, and eligibility. Once verified by our moderators, your listing will be published and 50 Pixels will be credited to your account.'
  },
  {
    id: 'is-pixel-minds-free',
    category: 'General',
    question: 'Is Pixel Minds free to use for students and developers?',
    answer:
      'Yes, Pixel Minds is 100% free! You can discover all listings, save bookmarks, track application deadlines, interact in the community feed, and participate in peer referrals with no subscription fees or hidden paywalls.'
  },
  {
    id: 'how-to-partner-or-host',
    category: 'Partnership',
    question: 'How can hackathon organizers and companies collaborate with us?',
    answer:
      'If you are hosting a hackathon, student competition, or hiring interns, we offer featured listings, community announcements, and outreach campaigns. Reach out directly to info.pixellminds@gmail.com with your proposal or event details.'
  },
  {
    id: 'how-to-contact-support',
    category: 'Support',
    question: 'Where can I reach out if I have questions or need technical support?',
    answer:
      'You can contact our support team anytime at info.pixellminds@gmail.com for any queries, bug reports, feature suggestions, or account assistance. We aim to respond within 24 hours.'
  }
];

export const FAQSection: React.FC = () => {
  const [openIds, setOpenIds] = useState<string[]>(['what-is-pixel-minds']);
  const [copied, setCopied] = useState(false);
  const supportEmail = 'info.pixellminds@gmail.com';

  const toggleFAQ = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <section id="faq" className="space-y-6 pt-2">
      {/* ============================================================ */}
      {/* TOP SUPPORT & QUERIES BANNER */}
      {/* ============================================================ */}
      <div id="support" className="rounded-3xl border border-white/90 dark:border-white/10 pm-glass-card p-5 sm:p-7 shadow-sm relative overflow-hidden transition-all">
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-blue-500/15 blur-3xl dark:bg-blue-600/20" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="h-11 w-11 sm:h-13 sm:w-13 rounded-2xl bg-gradient-to-br from-blue-600 to-[#112240] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-900/20">
              <Mail size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-[11px] font-bold text-blue-700 dark:text-blue-300 mb-1">
                <Sparkles size={11} className="text-blue-600 dark:text-blue-400" />
                <span>24/7 Builder Support</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#0e1b33] dark:text-white tracking-tight">
                Have questions or need assistance?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                Contact{' '}
                <a
                  href={`mailto:${supportEmail}`}
                  className="font-bold text-blue-600 dark:text-sky-400 hover:text-blue-800 dark:hover:text-sky-300 underline underline-offset-2 transition"
                >
                  {supportEmail}
                </a>{' '}
                for any queries and support
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              onClick={copyEmailToClipboard}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 text-[#0e1b33] dark:text-white border border-slate-200/80 dark:border-slate-700/80 px-4 py-2.5 text-xs font-bold shadow-2xs transition active:scale-[0.98] cursor-pointer"
              title="Copy email to clipboard"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied Email</span>
                </>
              ) : (
                <>
                  <Copy size={14} className="text-slate-500 dark:text-slate-400" />
                  <span>Copy Email</span>
                </>
              )}
            </button>

            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#112240] hover:bg-[#1a335e] text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-slate-900/10 transition active:scale-[0.98]"
            >
              <Mail size={14} />
              <span>Send an Email</span>
            </a>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FAQ SECTION HEADER */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pt-2">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            <HelpCircle size={12} className="text-blue-600 dark:text-sky-400" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0e1b33] dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quick answers about opportunity discovery, verification, and pixel rewards
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
          Showing {FAQ_DATA.length} common topics
        </div>
      </div>

      {/* ============================================================ */}
      {/* ACCORDION FAQ LIST */}
      {/* ============================================================ */}
      <div className="space-y-3">
        {FAQ_DATA.map((faq, index) => {
          const isOpen = openIds.includes(faq.id);
          return (
            <div
              key={faq.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? 'border-blue-300/80 dark:border-blue-500/40 pm-glass-card shadow-sm bg-white/85 dark:bg-slate-900/80'
                  : 'border-white/90 dark:border-white/10 pm-glass-card hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs bg-white/70 dark:bg-slate-900/60'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleFAQ(faq.id)}
                aria-expanded={isOpen}
                className="w-full px-4 sm:px-6 py-4 flex items-center justify-between gap-3 text-left transition select-none cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black transition-colors ${
                      isOpen
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    0{index + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#0e1b33] dark:text-white tracking-tight">
                    {faq.question}
                  </span>
                </div>

                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border transition-transform duration-200 ${
                    isOpen
                      ? 'rotate-180 bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300'
                      : 'bg-white/60 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 text-slate-400'
                  }`}
                >
                  <ChevronDown size={16} />
                </div>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100/80 dark:border-slate-800/60 mt-1">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* STILL HAVE QUESTIONS FOOTER CALLOUT */}
      {/* ============================================================ */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-white/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion size={16} className="text-blue-600 dark:text-sky-400 shrink-0" />
          <span>Couldn't find the answer you were looking for?</span>
        </div>
        <a
          href={`mailto:${supportEmail}`}
          className="font-bold text-blue-600 hover:text-blue-700 dark:text-sky-400 hover:underline flex items-center gap-1"
        >
          <span>Email our support team</span> &rarr;
        </a>
      </div>
    </section>
  );
};

