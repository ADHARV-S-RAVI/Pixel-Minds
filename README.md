# Pixel Minds

> The premier platform for builders, students, and engineers to discover verified hackathons, internships, fellowships, and developer opportunities.

---

## Overview

Pixel Minds connects ambitious builders with curated, verified technical opportunities. Builders discover events, track deadlines, submit community opportunities, interact on the community feed, earn reputation Pixels, and climb the platform leaderboard.

## Key Features

- **Opportunity Discovery & Search:** Real-time filtering, fuzzy keyword search, category views, and deadline tracking.
- **Community Feed & Discussions:** Markdown-safe discussions, hashtags, `@username` mentions, and likes.
- **Pixel Reputation Ledger:** Reward system for signups, referrals, and verified opportunity contributions with atomic ledger tracking and anti-fraud protections.
- **Secure Authentication & RBAC:** Supabase Auth with Google OAuth, email verification, role-based access control (Admins, Users), and account suspension enforcement.
- **Privacy & Row-Level Security:** Secure public profile views excluding private fields (email, phone, role), isolated user storage folders, and recursive sensitive-key log redaction.
- **Automated Email Notifications:** Transactional confirmation emails for applications and submissions via serverless API routes with origin validation and rate limiting.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, React Router v7, Vite 8
- **Styling:** Tailwind CSS v4, Lucide Icons, GSAP
- **Backend & Database:** Supabase (PostgreSQL 15+), Row-Level Security (RLS), PL/pgSQL Triggers & RPCs, Supabase Storage
- **Serverless API:** Vercel Serverless Functions (`api/send-email.ts`), Nodemailer
- **Linting & Testing:** Oxlint, Node.js Test Runner (`tsx --test`)

---

## Prerequisites

- **Node.js:** v20.x or higher
- **Package Manager:** `npm` (v10+)
- **Supabase Account:** Remote Supabase project or local Supabase CLI

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/pixel-minds/pixel-minds.git
cd pixel-minds
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy the example environment file and supply your configuration:
```bash
cp .env.example .env
```

| Variable | Description | Scope |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase project API URL | Client (Vite) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key | Client (Vite) |
| `VITE_SUPABASE_ANON_KEY` | Optional alias for anon key | Client (Vite) |
| `SUPABASE_URL` | Supabase project API URL | Serverless (`api/`) |
| `SUPABASE_ANON_KEY` | Supabase anon key | Serverless (`api/`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged service role key (Never expose to client) | Serverless (`api/`) |
---

## Supabase Database & Migrations

All database schemas, RLS policies, views, triggers, and RPC functions are version-controlled under `supabase/migrations/`:

```
supabase/
├── schema.sql              # Clean baseline schema definition
└── migrations/             # Monotonically sequenced, idempotent migrations
    ├── 20261104_...
    ├── 20261107_...
    ├── 20261108_...
    ├── 20261109_...
    ├── 20261110_...
    ├── 20261111_...
    ├── 20261113_...
    ├── 20261114_...
    ├── 20261121100000_feed_security_hardening_and_monitoring.sql
    ├── 20261121110000_phase1_security_and_privacy_hardening.sql
    ├── 20261121120000_phase1_counter_trigger_ratelimit_suspension.sql
    ├── 20261121123000_seed_send_email_rate_limit.sql
    ├── 20261121130000_opportunity_submission_security.sql
    ├── 20261121140000_phase2_database_integrity_and_reward_fixes.sql
    ├── 20261121150000_phase2_referrals_applications_reports_opp_policies.sql
    ├── 20261121160000_phase3_storage_monitoring_schema_alignment.sql
    ├── 20261121170000_phase3_harden_security_logging_and_redaction.sql
    └── 20261121180000_phase5_liker_identity_and_public_profiles.sql
```

To apply migrations locally via Supabase CLI:
```bash
npx supabase db push
```

---

## Development Commands

```bash
# Start local development server with Vite HMR
npm run dev

# Run Oxlint for code quality and hook verification
npm run lint

# Run security, identity, and regression test suites
npm test

# Run database integration tests (requires local Supabase instance)
npm run test:integration

# Typecheck and build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Security Architecture

1. **Row-Level Security (RLS):** Every table in the `public` schema has RLS strictly enabled. Direct mutations on counter fields, private profile columns, and ledger balances are revoked from public clients and protected by security definer RPCs.
2. **Public Profile Projection:** Safe public identities are queried via `public.public_profiles` and the `get_post_likers()` RPC. Private columns (`email`, `phone`, `role`, `status`, `is_suspended`) are never exposed across users.
3. **Storage Isolation:** Uploads require authentication and are segregated by bucket and user ID (`banners/<userId>/...`, `posts/<userId>/...`, `<userId>/...`). GIF formats are rejected for banners, magic bytes are inspected, and filename traversal is stripped.
4. **Content Security & Open Redirect Protection:** Internal navigation enforces `safeRedirectUrl()` rejecting external protocols, protocol-relative paths (`//`), backslash variations (`\`), and control characters.
5. **Observability:** Sensitive keys (passwords, tokens, bearer headers, session tokens) are recursively redacted before telemetry logs are persisted.

---

## License

This project is proprietary and confidential to Pixel Minds. All rights reserved.
