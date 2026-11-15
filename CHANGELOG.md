# Changelog

All notable changes to the Pixel Minds project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Standardized open-source community templates (Issue templates, PR template, CI workflow, Dependabot configuration).
- Open source documentation suite (`README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`, `ROADMAP.md`).
- Automated Continuous Integration workflow for linting and Vite production builds.

---

## [1.0.0] - 2026-11-15

### Initial Open Source Release

#### Core Features
- **Opportunities Discovery**: Browsable, searchable directory of verified hackathons, competitions, internships, and fellowships with date filtering and direct application links.
- **Community Feed**: Live developer feed supporting hashtag badges (`#topic`) and builder mentions (`@username`) with asynchronous lookup.
- **Atomic Pixel Rewards**: Double-entry ledger (`pixel_transactions`) supporting atomic balances, idempotency keys, and security definer functions for post creation rewards (+10 Pixels) and hackathon posts (+15 Pixels).
- **Submissions & Moderation Queue**: Community-submitted events with reward incentives (+20 on submission, +50 on admin approval).
- **Bookmarks Sync**: Cross-device, user-scoped persistence for bookmarked opportunities and discussion posts via Supabase.
- **Leaderboard & Builder Profiles**: Public and private profile views with Pixel tier rankings, contribution badges, and transaction history.
- **Email Notifications**: Serverless transactional notifications for event registrations and opportunity submissions with rate limiting and recipient verification.
- **Dark & Light Mode**: Built-in glassmorphism theme engine supporting seamless toggle between dark and light themes.

