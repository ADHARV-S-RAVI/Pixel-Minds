# Graph Report - Pixel Minds  (2026-11-22)

## Corpus Check
- 127 files · ~300,381 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 845 nodes · 1769 edges · 53 communities (43 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3578a75d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- compilerOptions
- storage.ts
- components.json
- compilerOptions
- Pixel Minds
- dependencies
- plugins
- ui.tsx
- tsconfig.json
- opportunities.ts
- Explore.tsx
- pixels.tsx
- dateUtils.ts
- rules/graphify.md
- workflows/graphify.md
- data.ts
- SearchAutocomplete.tsx
- LevelUpOverlay.tsx
- PixelProgressIllustration.tsx
- pages.tsx
- Leaderboard
- Icons.tsx
- store.tsx
- sign-artifacts.cjs
- vercel.json
- devDependencies
- GooeyNav.tsx
- send-email.ts
- scripts
- manifest.json
- SubmitOpportunity.tsx
- verify-apk.cjs
- ErrorBoundary
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
1. `useAuth()` - 51 edges
2. `react` - 47 edges
3. `Admin()` - 28 edges
4. `useApp()` - 25 edges
5. `PostCard` - 24 edges
6. `supabase` - 22 edges
7. `compilerOptions` - 19 edges
8. `Composer()` - 17 edges
9. `recordAuditLog()` - 16 edges
10. `Profile()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Composer()` --indirect_call--> `IconMessage()`  [INFERRED]
  src/ui.tsx → src/components/FeedIcons.tsx
- `Composer()` --indirect_call--> `IconTrophy()`  [INFERRED]
  src/ui.tsx → src/components/FeedIcons.tsx
- `Composer()` --indirect_call--> `IconLightbulb()`  [INFERRED]
  src/ui.tsx → src/components/FeedIcons.tsx
- `Composer()` --indirect_call--> `IconBook()`  [INFERRED]
  src/ui.tsx → src/components/FeedIcons.tsx
- `Composer()` --indirect_call--> `IconCompass()`  [INFERRED]
  src/ui.tsx → src/components/FeedIcons.tsx

## Import Cycles
- 2-file cycle: `src/services/admin.ts -> src/services/announcements.ts -> src/services/admin.ts`

## Communities (53 total, 10 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.05
Nodes (68): react, AdminLogin, App(), ForgotPassword, Login, NotFound, Notifications, PrivacyPolicy (+60 more)

### Community 1 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, src, src/tests, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly (+18 more)

### Community 2 - "storage.ts"
Cohesion: 0.17
Nodes (17): SubmissionDetailModal(), SubmissionDetailModalProps, uploadAnnouncementImage(), logFailedUpload(), ALLOWED_BANNER_TYPES, ALLOWED_IMAGE_TYPES, getPrimaryImageUrl(), MAX_IMAGE_SIZE_BYTES (+9 more)

### Community 3 - "components.json"
Cohesion: 0.09
Nodes (23): aliases, components, hooks, lib, ui, utils, Authorization, headers (+15 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 5 - "Pixel Minds"
Cohesion: 0.14
Nodes (13): 1. Clone the repository, 2. Install dependencies, 3. Configure environment variables, Development Commands, Getting Started, Key Features, License, Overview (+5 more)

### Community 6 - "dependencies"
Cohesion: 0.10
Nodes (21): firebase, gsap, lucide-react, nodemailer, dependencies, firebase, gsap, lucide-react (+13 more)

### Community 7 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 8 - "ui.tsx"
Cohesion: 0.07
Nodes (65): AuthPromptModal(), AuthPromptModalProps, ConfirmModal(), ConfirmModalProps, IconBook(), IconBookmark(), IconBriefcase(), IconCalendar() (+57 more)

### Community 10 - "opportunities.ts"
Cohesion: 0.11
Nodes (30): initialOpps, AdminCMS(), loadData(), Landing(), OppDetail(), Opportunities(), createReviewNotification(), addAdminDeletedOppId() (+22 more)

### Community 15 - "Explore.tsx"
Cohesion: 0.17
Nodes (12): Explore, ClickStack(), ClickStackProps, CATEGORIES, CategoryFilter, Explore(), GuideStep, ModeFilter (+4 more)

### Community 16 - "pixels.tsx"
Cohesion: 0.20
Nodes (9): Count(), ReferralPanel(), steps, useCount(), getReferralStats(), getUserReferrals(), LeaderboardUserEntry, Referral (+1 more)

### Community 17 - "dateUtils.ts"
Cohesion: 0.25
Nodes (12): AdminOpportunityForm(), submitOpportunity(), submitOpportunityAdmin(), DateValidationResult, formatDateToDDMMYYYY(), formatTimestampToDateInput(), getDaysInMonth(), isLeapYear() (+4 more)

### Community 20 - "data.ts"
Cohesion: 0.16
Nodes (12): cats, FeedPost, initialPosts, LeaderboardUser, moves, Opp, TierInfoResult, tiers (+4 more)

### Community 21 - "SearchAutocomplete.tsx"
Cohesion: 0.27
Nodes (8): POPULAR_KEYWORDS, SearchAutocomplete(), SearchAutocompleteProps, SearchPrediction, opps, globalSearch, searchGlobal(), SearchResults

### Community 22 - "LevelUpOverlay.tsx"
Cohesion: 0.25
Nodes (7): CELEBRATION_COLORS, CelebrationConfetti(), Particle, LEVEL_METAS, LevelMeta, LevelUpOverlay(), LevelUpOverlayProps

### Community 23 - "PixelProgressIllustration.tsx"
Cohesion: 0.29
Nodes (6): ALL_LEVEL_TILES, LEVEL_ART_DATA, PixelProgressIllustration(), PixelProgressIllustrationProps, PixelTile, useSmoothProgress()

### Community 24 - "pages.tsx"
Cohesion: 0.06
Nodes (67): AnnouncementModal(), FAQ_DATA, FAQItem, FAQSection(), IconBadge(), IconClock(), OPPORTUNITY_REASONS, POST_REASONS (+59 more)

### Community 25 - "Leaderboard"
Cohesion: 0.38
Nodes (7): rankOf(), tierInfo(), Feed(), Mini(), Leaderboard(), getLeaderboardUsers(), getUserGlobalRank()

### Community 26 - "Icons.tsx"
Cohesion: 0.02
Nodes (93): Activity, AlertCircle, AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, Award, BarChart2 (+85 more)

### Community 27 - "store.tsx"
Cohesion: 0.14
Nodes (27): Applications, Applications(), confirmOpportunityRegistration(), getLocalStorageApplications(), getUserApplications(), parseEpochMs(), recordOpportunityApplication(), saveLocalStorageApplications() (+19 more)

### Community 29 - "sign-artifacts.cjs"
Cohesion: 0.12
Nodes (15): aabStat, alignedApk, apksignerBat, apkStat, { execSync }, fs, keystore, path (+7 more)

### Community 32 - "vercel.json"
Cohesion: 0.50
Nodes (3): headers, rewrites, $schema

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (19): autoprefixer, oxlint, devDependencies, autoprefixer, oxlint, @playwright/test, postcss, tailwindcss (+11 more)

### Community 34 - "GooeyNav.tsx"
Cohesion: 0.09
Nodes (30): bezier(), build(), clamp01(), compile(), DropState, getSidebarActiveIndex(), NavItemDef, parse() (+22 more)

### Community 35 - "send-email.ts"
Cohesion: 0.22
Nodes (12): ALLOWED_ORIGIN_PATTERNS, APP_URL, buildRegistrationHtml(), buildSubmissionHtml(), checkRateLimit(), escapeHtml(), handler(), isAllowedOrigin() (+4 more)

### Community 36 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, test:integration

### Community 37 - "manifest.json"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, orientation, scope, short_name (+2 more)

### Community 41 - "SubmitOpportunity.tsx"
Cohesion: 0.13
Nodes (10): SubmitOpportunity, FormState, INITIAL_FORM, PRESET_TAGS, sanitizeDescription(), sanitizeMetadata(), stripExifAndProcessImage(), SubmitOpportunity() (+2 more)

### Community 44 - "verify-apk.cjs"
Cohesion: 0.18
Nodes (10): apkPath, checks, classesDexPath, dexdumpOutput, { execSync }, fs, path, rootDir (+2 more)

### Community 45 - "ErrorBoundary"
Cohesion: 0.20
Nodes (3): ErrorBoundary, Props, State

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
- **338 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+333 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `GooeyNav.tsx`, `storage.ts`, `plugins`, `ui.tsx`, `SubmitOpportunity.tsx`, `ErrorBoundary`, `Explore.tsx`, `pixels.tsx`, `SearchAutocomplete.tsx`, `LevelUpOverlay.tsx`, `PixelProgressIllustration.tsx`, `pages.tsx`, `Icons.tsx`, `store.tsx`?**
  _High betweenness centrality (0.204) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `App.tsx` to `ui.tsx`, `SubmitOpportunity.tsx`, `opportunities.ts`, `pixels.tsx`, `dateUtils.ts`, `pages.tsx`, `Leaderboard`, `store.tsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `App.tsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _338 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05207920792079208 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `components.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._