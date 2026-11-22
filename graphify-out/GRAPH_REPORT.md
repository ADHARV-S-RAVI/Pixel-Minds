# Graph Report - Pixel Minds  (2026-11-22)

## Corpus Check
- 126 files · ~299,633 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 975 nodes · 2027 edges · 62 communities (52 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c5b9c770`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- compilerOptions
- firebase.ts
- components.json
- compilerOptions
- Pixel Minds
- dependencies
- plugins
- ui.tsx
- tsconfig.json
- opportunities.ts
- data.ts
- pixels.tsx
- rules/graphify.md
- workflows/graphify.md
- Contributing to Pixel Minds
- pages.tsx
- Pixel Minds Roadmap
- Icons.tsx
- store.tsx
- feature_request.md
- sign-artifacts.cjs
- Changelog
- bug_report.md
- vercel.json
- devDependencies
- GooeyNav.tsx
- send-email.ts
- scripts
- manifest.json
- Pixel Minds Community Code of Conduct
- PULL_REQUEST_TEMPLATE.md
- Security Policy
- SubmitOpportunity.tsx
- documentation.md
- ✅ Completed Milestones
- verify-apk.cjs
- ErrorBoundary
- Support & Community Resources
- LauncherActivity
- build-twa.cjs
- @types/react
- package.json
- Application
- DelegationService
- gradlew
- tsx
- typescript
- vite
- sw.js

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 58 edges
2. `react` - 51 edges
3. `useApp()` - 29 edges
4. `Admin()` - 28 edges
5. `Admin()` - 28 edges
6. `PostCard` - 24 edges
7. `supabase` - 22 edges
8. `compilerOptions` - 19 edges
9. `Pixel Minds` - 19 edges
10. `recordAuditLog()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `AuthContextType` --references--> `User`  [EXTRACTED]
  src/contexts/AuthContext.tsx → src/types/index.ts
- `initialOpps` --calls--> `getOpportunityDeadlineInfo()`  [EXTRACTED]
  src/data.ts → src/utils/dateUtils.ts
- `loadData()` --calls--> `getPublishedOpportunities()`  [EXTRACTED]
  src/pages/Explore.tsx → src/services/opportunities.ts
- `Composer()` --indirect_call--> `IconMessage()`  [INFERRED]
  src/ui.tsx → src/components/FeedIcons.tsx
- `Composer()` --indirect_call--> `IconTrophy()`  [INFERRED]
  src/ui.tsx → src/components/FeedIcons.tsx

## Import Cycles
- 2-file cycle: `src/services/admin.ts -> src/services/announcements.ts -> src/services/admin.ts`

## Communities (62 total, 10 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.05
Nodes (70): react, AdminLogin, App(), ForgotPassword, Login, NotFound, Notifications, PrivacyPolicy (+62 more)

### Community 1 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, src, src/tests, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly (+18 more)

### Community 2 - "firebase.ts"
Cohesion: 0.29
Nodes (6): app, auth, db, firebaseConfig, googleProvider, storage

### Community 3 - "components.json"
Cohesion: 0.09
Nodes (23): aliases, components, hooks, lib, ui, utils, Authorization, headers (+15 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 5 - "Pixel Minds"
Cohesion: 0.07
Nodes (28): 1. Clone the repository, 2. Install dependencies, 3. Configure environment variables, 🌟 About the Project, 🏗️ Architecture & Tech Stack, 📜 Available Scripts, 💬 Community & Support, 🤝 Contributing (+20 more)

### Community 6 - "dependencies"
Cohesion: 0.10
Nodes (21): firebase, gsap, lucide-react, nodemailer, dependencies, firebase, gsap, lucide-react (+13 more)

### Community 7 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 8 - "ui.tsx"
Cohesion: 0.05
Nodes (79): AuthPromptModal(), AuthPromptModalProps, ConfirmModal(), ConfirmModalProps, IconBadge(), IconBook(), IconBookmark(), IconBriefcase() (+71 more)

### Community 10 - "opportunities.ts"
Cohesion: 0.08
Nodes (52): SubmissionDetailModal(), SubmissionDetailModalProps, Admin(), AdminTab, STATUS_OPTIONS, AdminOpportunityForm(), Landing(), MySubmissions() (+44 more)

### Community 15 - "data.ts"
Cohesion: 0.06
Nodes (34): Explore, ClickStack(), ClickStackProps, POPULAR_KEYWORDS, SearchAutocomplete(), SearchAutocompleteProps, SearchPrediction, cats (+26 more)

### Community 16 - "pixels.tsx"
Cohesion: 0.08
Nodes (30): CELEBRATION_COLORS, CelebrationConfetti(), Particle, LEVEL_METAS, LevelMeta, LevelUpOverlay(), LevelUpOverlayProps, ALL_LEVEL_TILES (+22 more)

### Community 23 - "Contributing to Pixel Minds"
Cohesion: 0.18
Nodes (11): Branch Naming Conventions, Code of Conduct, Code Quality & Guidelines, Commit Message Guidelines, Common Types, Contributing to Pixel Minds, Examples, Quick Development Workflow (+3 more)

### Community 24 - "pages.tsx"
Cohesion: 0.07
Nodes (68): AnnouncementModal(), FAQ_DATA, FAQItem, FAQSection(), OPPORTUNITY_REASONS, POST_REASONS, ReportModal(), ReportModalProps (+60 more)

### Community 25 - "Pixel Minds Roadmap"
Cohesion: 0.20
Nodes (10): 1. Calendar & Event Integrations, 2. Hackathon Teammate Matching, 3. Extended Achievements & Badges, 4. Progressive Web App (PWA), 🚧 In Progress, Open Source Standardization, 🏁 Phase Status Overview, Pixel Minds Roadmap (+2 more)

### Community 26 - "Icons.tsx"
Cohesion: 0.02
Nodes (93): Activity, AlertCircle, AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, Award, BarChart2 (+85 more)

### Community 27 - "store.tsx"
Cohesion: 0.21
Nodes (18): Applications, Applications(), confirmOpportunityRegistration(), getLocalStorageApplications(), getUserApplications(), parseEpochMs(), recordOpportunityApplication(), saveLocalStorageApplications() (+10 more)

### Community 28 - "feature_request.md"
Cohesion: 0.29
Nodes (5): Additional Context, Alternatives Considered, Problem Description, Proposed Solution, Target Audience

### Community 29 - "sign-artifacts.cjs"
Cohesion: 0.12
Nodes (15): aabStat, alignedApk, apksignerBat, apkStat, { execSync }, fs, keystore, path (+7 more)

### Community 30 - "Changelog"
Cohesion: 0.29
Nodes (6): [1.0.0] - 2026-11-15, Added, Changelog, Core Features, Initial Open Source Release, [Unreleased]

### Community 31 - "bug_report.md"
Cohesion: 0.29
Nodes (6): Additional Context, Describe the Bug, Environment & Device, Expected Behavior, Screenshots or Screen Recordings, Steps to Reproduce

### Community 32 - "vercel.json"
Cohesion: 0.50
Nodes (3): headers, rewrites, $schema

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (19): autoprefixer, oxlint, devDependencies, autoprefixer, oxlint, @playwright/test, postcss, tailwindcss (+11 more)

### Community 34 - "GooeyNav.tsx"
Cohesion: 0.09
Nodes (31): bezier(), build(), clamp01(), compile(), DropState, getSidebarActiveIndex(), NavItemDef, parse() (+23 more)

### Community 35 - "send-email.ts"
Cohesion: 0.18
Nodes (15): ALLOWED_ORIGIN_PATTERNS, APP_URL, buildRegistrationHtml(), buildSubmissionHtml(), checkRateLimit(), escapeHtml(), handler(), isAllowedOrigin() (+7 more)

### Community 36 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, test:integration

### Community 37 - "manifest.json"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, orientation, scope, short_name (+2 more)

### Community 38 - "Pixel Minds Community Code of Conduct"
Cohesion: 0.33
Nodes (6): Attribution, Community Standards, Enforcement Responsibilities, Our Pledge, Pixel Minds Community Code of Conduct, Reporting & Inquiries

### Community 39 - "PULL_REQUEST_TEMPLATE.md"
Cohesion: 0.33
Nodes (5): Checklist, Description, Key Areas Affected, Type of Change, Verification Steps

### Community 40 - "Security Policy"
Cohesion: 0.33
Nodes (6): Information to Include in Your Report, Our Security Commitment, Reporting a Vulnerability, Security Best Practices for Self-Hosters, Security Policy, Supported Versions

### Community 41 - "SubmitOpportunity.tsx"
Cohesion: 0.10
Nodes (18): SubmitOpportunity, CATEGORIES, FormState, INITIAL_FORM, PRESET_TAGS, sanitizeDescription(), sanitizeMetadata(), stripExifAndProcessImage() (+10 more)

### Community 42 - "documentation.md"
Cohesion: 0.40
Nodes (4): Additional Context, Documentation Page or Section, Proposed Content, What Needs to Be Changed?

### Community 43 - "✅ Completed Milestones"
Cohesion: 0.40
Nodes (5): Community Feed & Engagement, ✅ Completed Milestones, Core Platform & Authentication, Gamified Pixel Rewards & Ledger, Opportunities Engine

### Community 44 - "verify-apk.cjs"
Cohesion: 0.18
Nodes (10): apkPath, checks, classesDexPath, dexdumpOutput, { execSync }, fs, path, rootDir (+2 more)

### Community 45 - "ErrorBoundary"
Cohesion: 0.20
Nodes (3): ErrorBoundary, Props, State

### Community 46 - "Support & Community Resources"
Cohesion: 0.40
Nodes (5): 🐛 How to Report Bugs, 🚀 Requesting Features, Support & Community Resources, 💡 Where to Ask Questions, 📢 Where to Find Updates

### Community 47 - "LauncherActivity"
Cohesion: 0.48
Nodes (4): android.net.Uri, android.os.Bundle, Override, LauncherActivity

### Community 48 - "build-twa.cjs"
Cohesion: 0.33
Nodes (4): { execSync }, fs, http, path

### Community 50 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 53 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **417 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+412 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `GooeyNav.tsx`, `plugins`, `ui.tsx`, `SubmitOpportunity.tsx`, `opportunities.ts`, `ErrorBoundary`, `data.ts`, `pixels.tsx`, `pages.tsx`, `Icons.tsx`, `store.tsx`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `App.tsx` to `GooeyNav.tsx`, `ui.tsx`, `SubmitOpportunity.tsx`, `opportunities.ts`, `pixels.tsx`, `pages.tsx`, `store.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `App.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _417 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05078416728902166 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `components.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._