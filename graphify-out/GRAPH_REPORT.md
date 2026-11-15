# Graph Report - Pixel Minds  (2026-11-15)

## Corpus Check
- 110 files · ~171,736 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 694 nodes · 1550 edges · 49 communities (40 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e7b364cd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useAuth
- compilerOptions
- firebase.ts
- components.json
- compilerOptions
- useApp
- dependencies
- plugins
- ui.tsx
- tsconfig.json
- opportunities.ts
- notifications.ts
- Pixel Minds
- rules/graphify.md
- workflows/graphify.md
- Contributing to Pixel Minds
- pages.tsx
- package.json
- Pixel Minds Roadmap
- LevelUpOverlay.tsx
- feature_request.md
- Changelog
- bug_report.md
- ErrorBoundary.tsx
- vercel.json
- devDependencies
- GooeyNav.tsx
- send-email.ts
- Pixel Minds Community Code of Conduct
- PULL_REQUEST_TEMPLATE.md
- Security Policy
- documentation.md
- ✅ Completed Milestones
- store.tsx
- Support & Community Resources
- @tailwindcss/postcss
- data.ts
- @types/node
- @types/react
- @types/react-dom
- typescript

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 50 edges
2. `react` - 43 edges
3. `Admin()` - 29 edges
4. `PostCard()` - 24 edges
5. `useApp()` - 22 edges
6. `supabase` - 21 edges
7. `compilerOptions` - 19 edges
8. `Composer()` - 17 edges
9. `Profile()` - 16 edges
10. `recordAuditLog()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `AuthContextType` --references--> `User`  [EXTRACTED]
  src/contexts/AuthContext.tsx → src/types/index.ts
- `Composer()` --indirect_call--> `IconMessage()`  [INFERRED]
  src/ui.tsx → src/components/FeedIcons.tsx
- `Composer()` --indirect_call--> `IconTrophy()`  [INFERRED]
  src/ui.tsx → src/components/FeedIcons.tsx
- `Composer()` --indirect_call--> `IconLightbulb()`  [INFERRED]
  src/ui.tsx → src/components/FeedIcons.tsx
- `Composer()` --indirect_call--> `IconBook()`  [INFERRED]
  src/ui.tsx → src/components/FeedIcons.tsx

## Import Cycles
- 2-file cycle: `src/services/admin.ts -> src/services/announcements.ts -> src/services/admin.ts`

## Communities (49 total, 9 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.06
Nodes (65): react, App(), AdminRoute(), Footer(), Navbar(), OtpInput(), OtpInputProps, PixelMark() (+57 more)

### Community 1 - "compilerOptions"
Cohesion: 0.08
Nodes (24): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+16 more)

### Community 2 - "firebase.ts"
Cohesion: 0.29
Nodes (6): app, auth, db, firebaseConfig, googleProvider, storage

### Community 3 - "components.json"
Cohesion: 0.09
Nodes (23): aliases, components, hooks, lib, ui, utils, Authorization, headers (+15 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 5 - "useApp"
Cohesion: 0.13
Nodes (17): ClickStack(), ClickStackProps, OPPORTUNITY_REASONS, POST_REASONS, ReportModal(), ReportModalProps, CATEGORIES, CategoryFilter (+9 more)

### Community 6 - "dependencies"
Cohesion: 0.11
Nodes (19): firebase, gsap, lucide-react, nodemailer, dependencies, firebase, gsap, lucide-react (+11 more)

### Community 7 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 8 - "ui.tsx"
Cohesion: 0.08
Nodes (51): AuthPromptModal(), AuthPromptModalProps, IconBadge(), IconBook(), IconBookmark(), IconBriefcase(), IconCalendar(), IconClock() (+43 more)

### Community 10 - "opportunities.ts"
Cohesion: 0.06
Nodes (71): ConfirmModal(), ConfirmModalProps, SubmissionDetailModal(), SubmissionDetailModalProps, Admin(), AdminTab, STATUS_OPTIONS, AdminCMS() (+63 more)

### Community 15 - "notifications.ts"
Cohesion: 0.62
Nodes (5): NotificationBell(), getUserNotifications(), markAllNotificationsAsRead(), markNotificationAsRead(), AppNotification

### Community 16 - "Pixel Minds"
Cohesion: 0.10
Nodes (20): 🌟 About the Project, 🏗️ Architecture & Tech Stack, 📜 Available Scripts, 💬 Community & Support, 🤝 Contributing, Database Setup (Supabase), Deploying to Vercel, 🚀 Deployment (+12 more)

### Community 23 - "Contributing to Pixel Minds"
Cohesion: 0.18
Nodes (11): Branch Naming Conventions, Code of Conduct, Code Quality & Guidelines, Commit Message Guidelines, Common Types, Contributing to Pixel Minds, Examples, Quick Development Workflow (+3 more)

### Community 24 - "pages.tsx"
Cohesion: 0.07
Nodes (57): AnnouncementModal(), FAQ_DATA, FAQItem, FAQSection(), adminTabs, Landing(), Admin(), Opportunities() (+49 more)

### Community 25 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 26 - "Pixel Minds Roadmap"
Cohesion: 0.20
Nodes (10): 1. Calendar & Event Integrations, 2. Hackathon Teammate Matching, 3. Extended Achievements & Badges, 4. Progressive Web App (PWA), 🚧 In Progress, Open Source Standardization, 🏁 Phase Status Overview, Pixel Minds Roadmap (+2 more)

### Community 27 - "LevelUpOverlay.tsx"
Cohesion: 0.25
Nodes (7): CELEBRATION_COLORS, CelebrationConfetti(), Particle, LEVEL_METAS, LevelMeta, LevelUpOverlay(), LevelUpOverlayProps

### Community 28 - "feature_request.md"
Cohesion: 0.29
Nodes (5): Additional Context, Alternatives Considered, Problem Description, Proposed Solution, Target Audience

### Community 29 - "Changelog"
Cohesion: 0.29
Nodes (6): [1.0.0] - 2026-11-15, Added, Changelog, Core Features, Initial Open Source Release, [Unreleased]

### Community 30 - "bug_report.md"
Cohesion: 0.29
Nodes (6): Additional Context, Describe the Bug, Environment & Device, Expected Behavior, Screenshots or Screen Recordings, Steps to Reproduce

### Community 31 - "ErrorBoundary.tsx"
Cohesion: 0.29
Nodes (3): ErrorBoundary, Props, State

### Community 33 - "devDependencies"
Cohesion: 0.12
Nodes (17): autoprefixer, oxlint, devDependencies, autoprefixer, oxlint, @playwright/test, postcss, tailwindcss (+9 more)

### Community 34 - "GooeyNav.tsx"
Cohesion: 0.12
Nodes (23): bezier(), build(), clamp01(), compile(), DropState, getSidebarActiveIndex(), NavItemDef, parse() (+15 more)

### Community 35 - "send-email.ts"
Cohesion: 0.27
Nodes (10): buildRegistrationHtml(), buildSubmissionHtml(), escapeHtml(), handler(), isRateLimited(), rateLimitMap, RateRecord, RegistrationData (+2 more)

### Community 36 - "Pixel Minds Community Code of Conduct"
Cohesion: 0.33
Nodes (6): Attribution, Community Standards, Enforcement Responsibilities, Our Pledge, Pixel Minds Community Code of Conduct, Reporting & Inquiries

### Community 37 - "PULL_REQUEST_TEMPLATE.md"
Cohesion: 0.33
Nodes (5): Checklist, Description, Key Areas Affected, Type of Change, Verification Steps

### Community 38 - "Security Policy"
Cohesion: 0.33
Nodes (6): Information to Include in Your Report, Our Security Commitment, Reporting a Vulnerability, Security Best Practices for Self-Hosters, Security Policy, Supported Versions

### Community 39 - "documentation.md"
Cohesion: 0.40
Nodes (4): Additional Context, Documentation Page or Section, Proposed Content, What Needs to Be Changed?

### Community 40 - "✅ Completed Milestones"
Cohesion: 0.40
Nodes (5): Community Feed & Engagement, ✅ Completed Milestones, Core Platform & Authentication, Gamified Pixel Rewards & Ledger, Opportunities Engine

### Community 41 - "store.tsx"
Cohesion: 0.24
Nodes (16): confirmOpportunityRegistration(), getLocalStorageApplications(), getUserApplications(), parseEpochMs(), recordOpportunityApplication(), saveLocalStorageApplications(), UserApplication, userAppsTable() (+8 more)

### Community 42 - "Support & Community Resources"
Cohesion: 0.40
Nodes (5): 🐛 How to Report Bugs, 🚀 Requesting Features, Support & Community Resources, 💡 Where to Ask Questions, 📢 Where to Find Updates

### Community 44 - "data.ts"
Cohesion: 0.10
Nodes (21): POPULAR_KEYWORDS, SearchAutocomplete(), SearchAutocompleteProps, SearchPrediction, cats, FeedPost, initialOpps, initialPosts (+13 more)

## Knowledge Gaps
- **251 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+246 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `useAuth` to `GooeyNav.tsx`, `useApp`, `plugins`, `ui.tsx`, `store.tsx`, `opportunities.ts`, `data.ts`, `notifications.ts`, `pages.tsx`, `LevelUpOverlay.tsx`, `ErrorBoundary.tsx`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `useAuth` to `useApp`, `ui.tsx`, `store.tsx`, `opportunities.ts`, `notifications.ts`, `pages.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `useAuth`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _251 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.05811027224891329 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `components.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._