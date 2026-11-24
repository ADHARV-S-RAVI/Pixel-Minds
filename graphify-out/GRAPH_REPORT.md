# Graph Report - Pixel Minds  (2026-11-25)

## Corpus Check
- 137 files · ~326,293 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 861 nodes · 1856 edges · 54 communities (43 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `11f25793`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- compilerOptions
- AuthContext.tsx
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
- Settings.tsx
- rules/graphify.md
- workflows/graphify.md
- react
- notifications.ts
- LevelUpOverlay.tsx
- PixelProgressIllustration.tsx
- pages.tsx
- NotFound.tsx
- Icons.tsx
- store.tsx
- Footer.tsx
- sign-artifacts.cjs
- activity.ts
- @types/node
- vercel.json
- devDependencies
- GooeyNav.tsx
- send-email.ts
- scripts
- manifest.json
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
- sw.js

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 51 edges
2. `react` - 49 edges
3. `Admin()` - 28 edges
4. `PostCard` - 27 edges
5. `useApp()` - 25 edges
6. `supabase` - 24 edges
7. `Composer()` - 21 edges
8. `compilerOptions` - 19 edges
9. `recordAuditLog()` - 16 edges
10. `Profile()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `AuthContextType` --references--> `User`  [EXTRACTED]
  src/contexts/AuthContext.tsx → src/types/index.ts
- `ForgotPassword()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/ForgotPassword.tsx → src/contexts/AuthContext.tsx
- `ResetPassword()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/ResetPassword.tsx → src/contexts/AuthContext.tsx
- `initialOpps` --calls--> `getOpportunityDeadlineInfo()`  [EXTRACTED]
  src/data.ts → src/utils/dateUtils.ts
- `loadData()` --calls--> `getPublishedOpportunities()`  [EXTRACTED]
  src/pages/Explore.tsx → src/services/opportunities.ts

## Import Cycles
- 2-file cycle: `src/services/admin.ts -> src/services/announcements.ts -> src/services/admin.ts`

## Communities (54 total, 11 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.11
Nodes (18): AdminLogin, App(), ErrorPage, Login, Notifications, PrivacyPolicy, Terms, AdminRoute() (+10 more)

### Community 1 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, src, src/tests, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly (+18 more)

### Community 2 - "AuthContext.tsx"
Cohesion: 0.23
Nodes (16): ReferralOnboardingModal(), AuthContext, AuthContextType, AuthProvider(), AuthUser, isTestRunner, supabase, AdminLogin() (+8 more)

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
Nodes (73): AuthPromptModal(), AuthPromptModalProps, IconBook(), IconBookmark(), IconBriefcase(), IconCalendar(), IconCompass(), IconExternalLink() (+65 more)

### Community 10 - "opportunities.ts"
Cohesion: 0.05
Nodes (58): SubmitOpportunity, cats, AdminCMS(), AdminOpportunityForm(), Landing(), OppDetail(), Opportunities(), FormState (+50 more)

### Community 15 - "data.ts"
Cohesion: 0.06
Nodes (36): Explore, ClickStack(), ClickStackProps, EVENT_CATEGORIES, OpportunityAttachmentItem, SearchableOpportunitySelector(), SearchableOpportunitySelectorProps, POPULAR_KEYWORDS (+28 more)

### Community 16 - "pixels.tsx"
Cohesion: 0.13
Nodes (19): rankOf(), tierInfo(), tiers, Feed(), Mini(), Profile(), Count(), Leaderboard() (+11 more)

### Community 17 - "Settings.tsx"
Cohesion: 0.22
Nodes (12): Settings, Signup, BRANCH_MAP, COURSE_OPTIONS, CourseOption, getBranchesForCourse(), isPredefinedBranch(), Settings() (+4 more)

### Community 20 - "react"
Cohesion: 0.19
Nodes (10): react, ForgotPassword, ResetPassword, Props, State, OtpInput(), OtpInputProps, PixelMark() (+2 more)

### Community 21 - "notifications.ts"
Cohesion: 0.56
Nodes (7): NotificationBell(), Notifications(), deleteNotification(), getUserNotifications(), markAllNotificationsAsRead(), markNotificationAsRead(), AppNotification

### Community 22 - "LevelUpOverlay.tsx"
Cohesion: 0.25
Nodes (7): CELEBRATION_COLORS, CelebrationConfetti(), Particle, LEVEL_METAS, LevelMeta, LevelUpOverlay(), LevelUpOverlayProps

### Community 23 - "PixelProgressIllustration.tsx"
Cohesion: 0.29
Nodes (6): ALL_LEVEL_TILES, LEVEL_ART_DATA, PixelProgressIllustration(), PixelProgressIllustrationProps, PixelTile, useSmoothProgress()

### Community 24 - "pages.tsx"
Cohesion: 0.07
Nodes (63): AnnouncementModal(), ConfirmModal(), ConfirmModalProps, FAQ_DATA, FAQItem, FAQSection(), IconBadge(), IconClock() (+55 more)

### Community 25 - "NotFound.tsx"
Cohesion: 0.25
Nodes (6): NotFound, BurstParticle, DEFAULT_PIXELS, EXPLOSION_COLORS, FLICKER_NODES, Shockwave

### Community 26 - "Icons.tsx"
Cohesion: 0.02
Nodes (94): Activity, AlertCircle, AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, Award, BarChart2 (+86 more)

### Community 27 - "store.tsx"
Cohesion: 0.13
Nodes (27): Applications, OPPORTUNITY_REASONS, POST_REASONS, ReportModal(), ReportModalProps, Applications(), confirmOpportunityRegistration(), getLocalStorageApplications() (+19 more)

### Community 28 - "Footer.tsx"
Cohesion: 0.38
Nodes (3): EXCLUDED_PATHS, Footer(), Navbar()

### Community 29 - "sign-artifacts.cjs"
Cohesion: 0.12
Nodes (15): aabStat, alignedApk, apksignerBat, apkStat, { execSync }, fs, keystore, path (+7 more)

### Community 30 - "activity.ts"
Cohesion: 0.60
Nodes (4): formatRelativeTime(), getRecentPlatformActivities(), RecentActivityItem, sanitizeDisplayName()

### Community 32 - "vercel.json"
Cohesion: 0.50
Nodes (3): headers, rewrites, $schema

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (19): autoprefixer, oxlint, devDependencies, autoprefixer, oxlint, @playwright/test, postcss, tailwindcss (+11 more)

### Community 34 - "GooeyNav.tsx"
Cohesion: 0.08
Nodes (32): AccountMenuContent(), AccountMenuContentProps, bezier(), build(), clamp01(), compile(), DropState, getSidebarActiveIndex() (+24 more)

### Community 35 - "send-email.ts"
Cohesion: 0.22
Nodes (12): ALLOWED_ORIGIN_PATTERNS, APP_URL, buildRegistrationHtml(), buildSubmissionHtml(), checkRateLimit(), escapeHtml(), handler(), isAllowedOrigin() (+4 more)

### Community 36 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, test:integration

### Community 37 - "manifest.json"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, orientation, scope, short_name (+2 more)

### Community 44 - "verify-apk.cjs"
Cohesion: 0.18
Nodes (10): apkPath, checks, classesDexPath, dexdumpOutput, { execSync }, fs, path, rootDir (+2 more)

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
- **340 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+335 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `App.tsx`, `GooeyNav.tsx`, `AuthContext.tsx`, `plugins`, `ui.tsx`, `opportunities.ts`, `data.ts`, `pixels.tsx`, `Settings.tsx`, `notifications.ts`, `LevelUpOverlay.tsx`, `PixelProgressIllustration.tsx`, `pages.tsx`, `NotFound.tsx`, `Icons.tsx`, `store.tsx`, `Footer.tsx`?**
  _High betweenness centrality (0.202) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `App.tsx` to `GooeyNav.tsx`, `AuthContext.tsx`, `ui.tsx`, `opportunities.ts`, `pixels.tsx`, `Settings.tsx`, `react`, `notifications.ts`, `pages.tsx`, `store.tsx`, `Footer.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `react`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _340 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10804597701149425 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `components.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._