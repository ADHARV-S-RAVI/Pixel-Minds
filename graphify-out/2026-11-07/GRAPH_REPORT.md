# Graph Report - Pixel Minds  (2026-11-07)

## Corpus Check
- 87 files · ~111,835 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 614 nodes · 1233 edges · 34 communities (30 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8df2e273`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useAuth
- compilerOptions
- firebase.ts
- Phase 4A: Pixel Rewards & Transaction Ledger Supabase Migration Report
- compilerOptions
- pixel-minds/src/pages.tsx
- devDependencies
- plugins
- src/ui.tsx
- tsconfig.json
- opportunities.ts
- devDependencies
- compilerOptions
- React + TypeScript + Vite
- rules/graphify.md
- workflows/graphify.md
- src/pages.tsx
- Pixel Minds Backend Integration Audit
- Phase 3: Community Posts & Feed Supabase Migration Report
- Pixel Minds - Auth & Profile Completion Update Report
- 1. Verified Opportunities Directory (By Category)
- audit-test.mjs
- src/store.tsx
- 2. Features Inspected & Audit Findings
- vercel.json
- src/pixels.tsx

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 46 edges
2. `react` - 33 edges
3. `Admin()` - 28 edges
4. `compilerOptions` - 18 edges
5. `supabase` - 16 edges
6. `recordAuditLog()` - 16 edges
7. `useApp()` - 16 edges
8. `compilerOptions` - 15 edges
9. `Pixel Minds Backend Integration Audit` - 13 edges
10. `Profile()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `AuthContextType` --references--> `User`  [EXTRACTED]
  src/contexts/AuthContext.tsx → src/types/index.ts
- `ReportModal()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/ReportModal.tsx → src/contexts/AuthContext.tsx
- `ReportModal()` --calls--> `createReport()`  [EXTRACTED]
  src/components/ReportModal.tsx → src/services/reports.ts
- `SubmissionDetailModalProps` --references--> `Opportunity`  [EXTRACTED]
  src/components/SubmissionDetailModal.tsx → src/types/index.ts
- `AdminCMS()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages.tsx → src/contexts/AuthContext.tsx

## Import Cycles
- 2-file cycle: `src/services/admin.ts -> src/services/announcements.ts -> src/services/admin.ts`

## Communities (34 total, 4 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.07
Nodes (43): react, App(), AdminRoute(), ErrorBoundary, Props, State, Footer(), Navbar() (+35 more)

### Community 1 - "compilerOptions"
Cohesion: 0.08
Nodes (23): vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module (+15 more)

### Community 2 - "firebase.ts"
Cohesion: 0.29
Nodes (6): app, auth, db, firebaseConfig, googleProvider, storage

### Community 3 - "Phase 4A: Pixel Rewards & Transaction Ledger Supabase Migration Report"
Cohesion: 0.20
Nodes (9): 1. Overview & Objectives Achieved, 2. Files Changed & Created, 3. Data Flow & Architecture, 4. Manual Supabase SQL Check (If Tables Do Not Already Exist), 5. Verification Results, A. User Pixel Balance & History, B. Admin Pixel Adjustments, C. Reward Configuration (+1 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 5 - "pixel-minds/src/pages.tsx"
Cohesion: 0.06
Nodes (51): App(), cats, moves, Opp, opps, posts, rankOf(), refs (+43 more)

### Community 6 - "devDependencies"
Cohesion: 0.04
Nodes (47): autoprefixer, firebase, oxlint, dependencies, firebase, lucide-react, react, react-dom (+39 more)

### Community 7 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 8 - "src/ui.tsx"
Cohesion: 0.07
Nodes (41): bezier(), build(), clamp01(), compile(), DropState, getSidebarActiveIndex(), NavItemDef, parse() (+33 more)

### Community 10 - "opportunities.ts"
Cohesion: 0.10
Nodes (35): SubmissionDetailModal(), SubmissionDetailModalProps, Admin(), AdminTab, STATUS_OPTIONS, AdminCMS(), AdminOpportunityForm(), MySubmissions() (+27 more)

### Community 15 - "devDependencies"
Cohesion: 0.06
Nodes (32): dependencies, lucide-react, react, react-dom, react-router-dom, devDependencies, tailwindcss, @tailwindcss/vite (+24 more)

### Community 16 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+5 more)

### Community 17 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 24 - "src/pages.tsx"
Cohesion: 0.08
Nodes (58): AnnouncementModal(), adminTabs, Landing(), Admin(), AdminMetrics, createAdminCommunityPost(), deleteCommunityPost(), getAuditLogs() (+50 more)

### Community 25 - "Pixel Minds Backend Integration Audit"
Cohesion: 0.08
Nodes (23): 10. Problems Found & Technical Analysis, 11. Recommended Next Technical Steps, 12. Verification Sign-Off, 1. Executive Summary, 2. Architecture, 3. Feature-by-Feature Audit, 4. Cross-User Data Flow, 5. Database Mapping (Supabase Schema vs Code) (+15 more)

### Community 26 - "Phase 3: Community Posts & Feed Supabase Migration Report"
Cohesion: 0.29
Nodes (6): 1. Summary of Migration, 2. Files Changed & Added, 3. RLS & Security Status, 4. Dependencies Removed, 5. Verification & Quality Checks, Phase 3: Community Posts & Feed Supabase Migration Report

### Community 27 - "Pixel Minds - Auth & Profile Completion Update Report"
Cohesion: 0.20
Nodes (9): 1. Summary of Changes, 2. Files Changed & Created, 3. Flows & Logic, 4. Supabase Database Migration (Manual SQL), 5. Verification Results, A. Password Recovery Flow, B. Change Password Flow (Authenticated), C. Signup Details Flow (+1 more)

### Community 28 - "1. Verified Opportunities Directory (By Category)"
Cohesion: 0.17
Nodes (11): 1. Verified Opportunities Directory (By Category), 2. Automatic Expiry & 30-Day Cleanup Mechanism, 3. UI Contrast & Theme Enhancements, Category 1: Hackathons (6 Verified), Category 2: Internships (6 Verified), Category 3: Events (5 Verified), Category 4: Workshops (5 Verified), Category 5: Scholarships (5 Verified) (+3 more)

### Community 29 - "audit-test.mjs"
Cohesion: 0.43
Nodes (6): fail(), manual(), pass(), results, runAudit(), supabase

### Community 30 - "src/store.tsx"
Cohesion: 0.23
Nodes (14): Profile(), confirmOpportunityRegistration(), getLocalStorageApplications(), getUserApplications(), recordOpportunityApplication(), saveLocalStorageApplications(), UserApplication, updateUserProfile() (+6 more)

### Community 31 - "2. Features Inspected & Audit Findings"
Cohesion: 0.12
Nodes (15): 1. Executive Summary, 2. Features Inspected & Audit Findings, 3. Bugs Identified & Fixes Applied, 4. Security Audit Matrix, 5. Automated Build & Test Results, 6. Features Requiring Manual Verification (Multi-Account Scenarios), 7. Remaining Known Issues & Supabase Recommendations, A. User Management (`Users & Pixels` Tab) (+7 more)

### Community 34 - "src/pixels.tsx"
Cohesion: 0.08
Nodes (27): cats, FeedPost, initialOpps, initialPosts, LeaderboardUser, moves, Opp, opps (+19 more)

## Knowledge Gaps
- **227 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+222 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `useAuth` to `src/pixels.tsx`, `pixel-minds/src/pages.tsx`, `plugins`, `src/ui.tsx`, `opportunities.ts`, `src/pages.tsx`, `src/store.tsx`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `useAuth` to `src/pixels.tsx`, `src/ui.tsx`, `opportunities.ts`, `src/pages.tsx`, `src/store.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `useAuth`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _227 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.07370600414078675 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._