import { Link } from 'react-router-dom';
import { Scale, ArrowLeft, CheckCircle2, AlertTriangle } from '@/components/Icons';

export function Terms() {
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

      {/* Header (No card - clean document heading) */}
      <header className="mb-8">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-2.5">
          <Scale size={14} />
          <span>User Agreement</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
          Terms and Conditions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Last Updated: <span className="font-medium text-slate-700 dark:text-slate-300">{lastUpdated}</span> · Effective Immediately
        </p>
        <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Welcome to Pixel Minds. By accessing, browsing, registering for, or using our website and services, you agree to be bound by these 
          Terms and Conditions (&quot;Terms&quot;). If you do not agree with these Terms, please refrain from using the platform.
        </p>
      </header>

      <hr className="border-slate-200/80 dark:border-slate-800 my-8" />

      {/* Main Content (Flowing text document without card wrappers) */}
      <article className="space-y-10 text-sm sm:text-base leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            1. Eligibility and Account Registration
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            To register and create an account on Pixel Minds, you must satisfy the following eligibility criteria:
          </p>
          <ul className="space-y-2 text-slate-600 dark:text-slate-300 text-sm">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-sky-500 shrink-0 mt-0.5" />
              <span>
                <strong>Age &amp; Legal Capacity:</strong> You must be at least 18 years of age (the age of majority in India). If you are between 13 and 17 years of age, you may register and use the platform only with the verifiable consent, guidance, and ongoing supervision of a parent or lawful guardian in alignment with child data protection requirements under Section 9 of the Digital Personal Data Protection Act, 2023. Children under 13 years of age are strictly prohibited from creating an account or providing personal data.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-sky-500 shrink-0 mt-0.5" />
              <span>Provide accurate, authentic, and current profile and academic information.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-sky-500 shrink-0 mt-0.5" />
              <span>Maintain the confidentiality of your account credentials and immediately notify us of any unauthorized access.</span>
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            2. Nature of Platform &amp; Opportunity Directory
          </h2>
          {/* Highlight callout for important platform disclaimer */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong>Important Platform Notice:</strong> Pixel Minds is an aggregation, curation, and community discovery platform. Unless explicitly stated in writing, Pixel Minds is <strong>NOT</strong> the official organizer, sponsor, or hiring employer for opportunities listed on the platform.
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            When you view or apply for an opportunity:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300 text-sm">
            <li>You are redirected to official third-party portals hosted by respective hackathon organizers, companies, or universities.</li>
            <li>We do not guarantee the completeness, accuracy, prize disbursement, or deadline updates of third-party events.</li>
            <li>You are responsible for verifying official guidelines, eligibility criteria, and fee requirements on the official host website.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            3. Applications Tracker Disclaimer
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            The Pixel Minds &quot;Applications Tracker&quot; is an individual productivity tool provided solely for your personal tracking convenience. 
            Logging an event in your tracker does <strong>not</strong> constitute an official application to the external organizer, 
            nor does it guarantee selection, acceptance, interview, or employment by any organization.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            4. Pixels Rewards &amp; Gamification Rules
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            &quot;Pixels&quot; are internal virtual activity and reputation points designed to encourage positive builder contributions and community participation.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300 text-sm">
            <li><strong>No Monetary Value:</strong> Pixels are NOT cryptocurrency, digital assets, or legal tender. They carry zero fiat cash value and cannot be exchanged, sold, or redeemed for currency.</li>
            <li><strong>Non-Transferable:</strong> Pixels are bound strictly to your verified account and cannot be transferred between accounts.</li>
            <li><strong>Anti-Abuse Clause:</strong> Creating fake accounts, engaging in self-referral rings, deploying automated scripts/bots, or submitting fraudulent listings will result in immediate cancellation of all accumulated Pixels, ledger revocation, and permanent account termination.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            5. User-Generated Content &amp; Community Guidelines
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            When posting opportunities, discussions, or comments, you agree not to submit:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300 text-sm">
            <li>Misleading, malicious, fraudulent, or phishing URLs.</li>
            <li>Hate speech, harassment, defamation, or content violating applicable Indian laws (including Section 69A of the Information Technology Act, 2000 and the Intermediary Guidelines Rules, 2021).</li>
            <li>Unauthorized commercial spam, pyramid schemes, or unsolicited advertising.</li>
            <li>Content infringing upon third-party intellectual property or copyrights.</li>
          </ul>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm pt-1">
            Pixel Minds reserves the right to review, moderate, reject, or remove any content or opportunity that fails to meet community safety standards.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            6. Limitation of Liability
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            To the maximum extent permitted by applicable law, Pixel Minds and its operators shall not be liable for any direct, indirect, incidental, 
            consequential, or exemplary damages arising out of your use of the platform, your participation in external hackathons/competitions, 
            or reliance on any information provided within opportunity listings.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            7. Governing Law and Jurisdiction
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            These Terms shall be governed by and construed in accordance with the laws of the <strong>Republic of India</strong>. 
            Any disputes arising out of or related to these Terms or the platform shall be subject to the exclusive jurisdiction of the competent courts in India.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            8. Contact &amp; Queries
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            For questions, legal notices, or feedback regarding these Terms, please reach out to:
          </p>
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-300">
            Email: <a href="mailto:info.pixellminds@gmail.com" className="text-sky-600 dark:text-sky-400 underline font-semibold">info.pixellminds@gmail.com</a>
          </div>
        </section>
      </article>

      {/* Footer Navigation Link */}
      <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
        <Link to="/privacy-policy" className="text-sky-600 dark:text-sky-400 hover:underline font-bold">
          &larr; View Privacy Policy
        </Link>
        <span>Pixel Minds &copy; {currentYear}</span>
      </div>
    </div>
  );
}
