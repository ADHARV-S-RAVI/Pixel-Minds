# Security Policy

The Pixel Minds team and community take the security of our platform, user data, and ledger integrity seriously. We appreciate the responsible disclosure of any potential vulnerabilities.

---

## Supported Versions

Security updates and critical patches are actively provided for the following releases:

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| `< 1.0` | :x:                |

We strongly advise developers deploying Pixel Minds to run the latest revision of the `main` branch with up-to-date database migration scripts.

---

## Reporting a Vulnerability

> [!CAUTION]
> **Do NOT file public GitHub issues or submit public pull requests for suspected security vulnerabilities or exposed credentials.**

If you discover a security vulnerability, authentication bypass, data exposure, or ledger tampering issue, please report it privately:

1. **Email Disclosure**: Send an email directly to **info.pixellminds@gmail.com**.
2. **Subject Line**: Use the format `[SECURITY VULNERABILITY] <Brief Description>`.

### Information to Include in Your Report

To help us assess and resolve the issue quickly, please provide:
- A clear description of the vulnerability and its potential impact.
- Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
- The specific files, API endpoints, or database functions involved.
- Any known mitigations or suggested fixes.
- Your contact details for follow-up and credit.

---

## Our Security Commitment

When a private security report is received:
1. We will acknowledge receipt within 48 hours.
2. We will investigate the issue and verify its severity in an isolated development environment.
3. Once verified, we will draft and test a patch before deploying it to production and merging it into `main`.
4. We will coordinate public credit with the reporter after the fix is safely in place.

---

## Security Best Practices for Self-Hosters

When self-hosting Pixel Minds:
- **Never expose your Supabase Service Role Key** (`service_role`) in client-side code, public environment files, or Vite build bundles.
- Ensure PostgreSQL Row Level Security (RLS) is enabled on all tables in Supabase.
- Always configure secure SMTP credentials via server-side environment variables (`SMTP_PASS`) on your hosting provider (e.g. Vercel dashboard) rather than client bundles.
- Keep `.env` and local override files excluded from version control at all times.

