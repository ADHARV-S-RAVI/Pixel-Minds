import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, CheckCircle2 } from '@/components/Icons';

export function PrivacyPolicy() {
  const lastUpdated = 'November 21, 2026';
  const currentYear = 2026;

  return (
    <div className="py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-slate-800 dark:text-slate-200">
      {/* Back to Home Link */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-500 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Header (No card - pure clean document heading) */}
      <header className="mb-8">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-2.5">
          <Shield size={14} />
          <span>Official Legal Document</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Last Updated: <span className="font-medium text-slate-700 dark:text-slate-300">{lastUpdated}</span> · Phased Compliance Implementation
        </p>
        <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Pixel Minds (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) values your trust and is committed to protecting your personal data.
          This Privacy Policy outlines how we collect, process, store, and safeguard your personal information when you access or use the Pixel Minds platform,
          in phased alignment with the <strong>Digital Personal Data Protection Act, 2023 (&quot;DPDPA 2023&quot;)</strong> and its notified implementation timelines
          (including statutory transition milestones leading to primary substantive enforcement on May 13, 2027), along with the 
          <strong>Information Technology Act, 2000</strong> and applicable intermediary guidelines.
        </p>
      </header>

      <hr className="border-slate-200/80 dark:border-slate-800 my-8" />

      {/* Main Content (Flowing text document without card wrappers) */}
      <article className="space-y-10 text-sm sm:text-base leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            1. Data Fiduciary Details &amp; Operator Identity
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            Pixel Minds operates as a <strong>Data Fiduciary</strong> in respect of personal data collected through the website and web applications.
          </p>
          {/* Subtle highlight callout for fiduciary info */}
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs sm:text-sm space-y-1 font-mono text-slate-700 dark:text-slate-300">
            <div><strong className="text-slate-900 dark:text-white">Platform:</strong> Pixel Minds (https://pixelminds.tech)</div>
            <div><strong className="text-slate-900 dark:text-white">Operating Entity:</strong> Pixel Minds Operations Team</div>
            <div><strong className="text-slate-900 dark:text-white">Grievance &amp; Compliance Contact:</strong> info.pixellminds@gmail.com</div>
            <div><strong className="text-slate-900 dark:text-white">Jurisdiction:</strong> Republic of India</div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            2. Information We Collect
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            We only collect personal information that is reasonably necessary to provide our directory, authentication, community, and reward features:
          </p>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-sky-500 shrink-0 mt-1" />
              <div>
                <strong className="text-slate-900 dark:text-white">Account &amp; Profile Information:</strong> Full name, chosen username, verified email address, profile avatar image, biographical text, and external portfolio/social links you provide.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-sky-500 shrink-0 mt-1" />
              <div>
                <strong className="text-slate-900 dark:text-white">Academic Details:</strong> College/University name, course/degree (e.g., B.Tech, BCA), year of study, and academic branch/department to personalize relevant student opportunities.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-sky-500 shrink-0 mt-1" />
              <div>
                <strong className="text-slate-900 dark:text-white">User Contributions &amp; Submissions:</strong> Opportunities you submit for curation (titles, descriptions, organizers, links, deadlines), community feed discussions, comments, likes, and bookmarks.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-sky-500 shrink-0 mt-1" />
              <div>
                <strong className="text-slate-900 dark:text-white">Application Tracking Records:</strong> Personal logs of opportunities you have registered for, status changes, and participation confirmations.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-sky-500 shrink-0 mt-1" />
              <div>
                <strong className="text-slate-900 dark:text-white">Reward Activity &amp; Referral Data:</strong> Pixels earned (internal non-cash platform reputation points), ledger transaction logs, and referral codes applied or distributed.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-sky-500 shrink-0 mt-1" />
              <div>
                <strong className="text-slate-900 dark:text-white">Technical &amp; Session Information:</strong> Session tokens (Supabase JWT access and refresh tokens stored in browser local storage for session authentication), device type, IP address, user agent, and theme preference.
              </div>
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            3. Purpose of Processing &amp; Legal Basis
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            In accordance with the DPDPA 2023, we process personal data for specific, lawful purposes based on your explicit consent or legitimate uses:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>
              <strong className="text-slate-900 dark:text-white">Account &amp; Auth:</strong> Authenticating sessions, managing passwords, and protecting account security via PKCE OAuth.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-white">Transactional Emails:</strong> Sending application confirmations, password resets, and submission review notifications via SMTP.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-white">Public Profiles &amp; Leaderboards:</strong> Displaying your username, avatar, rank, and pixel balance. We never expose your email publicly.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-white">Safety &amp; Anti-Spam:</strong> Auditing submissions, preventing referral fraud, and enforcing community moderation rules.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            4. Verified Third-Party Data Processors
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            We partner exclusively with reputable infrastructure providers who uphold stringent security standards:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>
              <strong className="text-slate-900 dark:text-white">Supabase Inc.:</strong> Manages user authentication, PostgreSQL database storage with Row-Level Security (RLS), and secure asset storage.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-white">Vercel Inc.:</strong> Provides global edge delivery, frontend hosting, serverless backend compute, and privacy-preserving web analytics.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-white">SMTP Email Service:</strong> Delivers transactional emails, OTP verification codes, and security notices.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-white">Google LLC:</strong> Facilitates optional Google OAuth single-sign-on when chosen by the user.
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            5. Cookies and Local Storage
          </h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Pixel Minds does not use third-party advertising tracking cookies. We utilize browser local storage and session storage exclusively for essential operational functionality:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li><strong>Authentication Sessions:</strong> Supabase access and refresh tokens stored in browser local storage to maintain authenticated user sessions.</li>
            <li><strong>Theme Preference:</strong> Storing your selection of Light or Dark mode.</li>
            <li><strong>UI State:</strong> Sidebar expanded/collapsed preferences and draft form entries so you do not lose progress.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            6. Data Principal Rights (Under DPDPA 2023)
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            Under India&apos;s Digital Personal Data Protection Act, you have the following enforceable rights regarding your personal data:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li><strong>Right to Access:</strong> You can view a summary of your profile information, activity, and application logs anytime in your Settings and Profile dashboard.</li>
            <li><strong>Right to Correction &amp; Updating (Section 12):</strong> You may edit your name, bio, college, and academic details directly via your Settings page.</li>
            <li><strong>Right to Erasure &amp; Account Deletion (Section 12):</strong> You have the right to request deletion of your account and erasure of personal data. To initiate an account and data deletion request, email our Grievance Officer at <a href="mailto:info.pixellminds@gmail.com" className="text-sky-600 dark:text-sky-400 underline">info.pixellminds@gmail.com</a> from your registered email address. Requests are validated and permanently processed within statutory timeframes.</li>
            <li><strong>Right of Grievance Redressal (Section 13):</strong> You have the right to readily available grievance redressal in respect of any act or omission by Pixel Minds in relation to performance of its obligations.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            7. Grievance Redressal Officer
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            In compliance with Section 13 of the DPDPA 2023 and Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the contact details of our Grievance Officer are:
          </p>
          {/* Subtle highlight callout for contact details */}
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs sm:text-sm space-y-1.5 text-slate-700 dark:text-slate-300">
            <div><strong className="text-slate-900 dark:text-white">Designation:</strong> Grievance Redressal Officer (Data Protection &amp; Legal Compliance)</div>
            <div><strong className="text-slate-900 dark:text-white">Operator:</strong> Pixel Minds Operational Team</div>
            <div><strong className="text-slate-900 dark:text-white">Email:</strong> <a href="mailto:info.pixellminds@gmail.com" className="text-sky-600 dark:text-sky-400 font-semibold underline">info.pixellminds@gmail.com</a></div>
            <div><strong className="text-slate-900 dark:text-white">Response Window:</strong> Acknowledged within 48 hours; redressed within applicable statutory timeframes (up to 30 days under DPDPA and IT Rules).</div>
          </div>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            8. External Links &amp; Third-Party Events
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            Pixel Minds provides links to external websites hosting hackathons, competitions, internships, and fellowships.
            When you click an official application link, you are directed to a third-party domain governed by its own independent privacy policy.
            We recommend reviewing the privacy notices of external organizers before submitting sensitive data to them.
          </p>
        </section>
      </article>

      {/* Footer Navigation Link */}
      <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
        <Link to="/terms" className="text-sky-600 dark:text-sky-400 hover:underline font-bold">
          View Terms &amp; Conditions &rarr;
        </Link>
        <span>Pixel Minds &copy; {currentYear}</span>
      </div>
    </div>
  );
}
