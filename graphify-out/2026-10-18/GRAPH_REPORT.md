# Graph Report - Pixel Minds  (2026-10-18)

## Corpus Check
- 74 files · ~55,895 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 518 nodes · 1024 edges · 29 communities (26 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `998bff2b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AuthContext.tsx
- compilerOptions
- firebase.ts
- Phase 4A: Pixel Rewards & Transaction Ledger Supabase Migration Report
- compilerOptions
- pixel-minds/src/pages.tsx
- devDependencies
- plugins
- src/pages.tsx
- tsconfig.json
- opportunities.ts
- devDependencies
- compilerOptions
- React + TypeScript + Vite
- rules/graphify.md
- workflows/graphify.md
- admin.ts
- Pixel Minds Backend Integration Audit
- Phase 3: Community Posts & Feed Supabase Migration Report
- Pixel Minds - Auth & Profile Completion Update Report
- ErrorBoundary.tsx

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 41 edges
2. `react` - 29 edges
3. `Admin()` - 24 edges
4. `compilerOptions` - 18 edges
5. `compilerOptions` - 15 edges
6. `supabase` - 14 edges
7. `useApp()` - 13 edges
8. `Pixel Minds Backend Integration Audit` - 13 edges
9. `recordAuditLog()` - 12 edges
10. `Opportunity` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Navbar()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/Navbar.tsx → src/contexts/AuthContext.tsx
- `NotificationBell()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/NotificationBell.tsx → src/contexts/AuthContext.tsx
- `SubmissionDetailModalProps` --references--> `Opportunity`  [EXTRACTED]
  src/components/SubmissionDetailModal.tsx → src/types/index.ts
- `AuthContextType` --references--> `User`  [EXTRACTED]
  src/contexts/AuthContext.tsx → src/types/index.ts
- `AdminLogin()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/AdminLogin.tsx → src/contexts/AuthContext.tsx

## Import Cycles
- 2-file cycle: `src/services/admin.ts -> src/services/announcements.ts -> src/services/admin.ts`

## Communities (29 total, 3 thin omitted)

### Community 0 - "AuthContext.tsx"
Cohesion: 0.13
Nodes (18): react, Footer(), Navbar(), PixelMark(), AuthContext, AuthContextType, AuthProvider(), AuthUser (+10 more)

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
Nodes (45): autoprefixer, firebase, oxlint, dependencies, firebase, lucide-react, react, react-dom (+37 more)

### Community 7 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 8 - "src/pages.tsx"
Cohesion: 0.06
Nodes (63): App(), AdminRoute(), ProtectedRoute(), useAuth(), cats, FeedPost, initialOpps, initialPosts (+55 more)

### Community 10 - "opportunities.ts"
Cohesion: 0.11
Nodes (27): SubmissionDetailModal(), SubmissionDetailModalProps, Admin(), AdminTab, STATUS_OPTIONS, MySubmissions(), CATEGORIES, Opportunities() (+19 more)

### Community 15 - "devDependencies"
Cohesion: 0.06
Nodes (32): dependencies, lucide-react, react, react-dom, react-router-dom, devDependencies, tailwindcss, @tailwindcss/vite (+24 more)

### Community 16 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+5 more)

### Community 17 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 24 - "admin.ts"
Cohesion: 0.07
Nodes (55): AnnouncementModal(), NotificationBell(), supabase, Admin(), AdminMetrics, createAdminCommunityPost(), deleteCommunityPost(), getAuditLogs() (+47 more)

### Community 25 - "Pixel Minds Backend Integration Audit"
Cohesion: 0.08
Nodes (23): 10. Problems Found & Technical Analysis, 11. Recommended Next Technical Steps, 12. Verification Sign-Off, 1. Executive Summary, 2. Architecture, 3. Feature-by-Feature Audit, 4. Cross-User Data Flow, 5. Database Mapping (Supabase Schema vs Code) (+15 more)

### Community 26 - "Phase 3: Community Posts & Feed Supabase Migration Report"
Cohesion: 0.29
Nodes (6): 1. Summary of Migration, 2. Files Changed & Added, 3. RLS & Security Status, 4. Dependencies Removed, 5. Verification & Quality Checks, Phase 3: Community Posts & Feed Supabase Migration Report

### Community 27 - "Pixel Minds - Auth & Profile Completion Update Report"
Cohesion: 0.20
Nodes (9): 1. Summary of Changes, 2. Files Changed & Created, 3. Flows & Logic, 4. Supabase Database Migration (Manual SQL), 5. Verification Results, A. Password Recovery Flow, B. Change Password Flow (Authenticated), C. Signup Details Flow (+1 more)

### Community 28 - "ErrorBoundary.tsx"
Cohesion: 0.29
Nodes (3): ErrorBoundary, Props, State

## Knowledge Gaps
- **182 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+177 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `AuthContext.tsx` to `pixel-minds/src/pages.tsx`, `plugins`, `src/pages.tsx`, `opportunities.ts`, `admin.ts`, `ErrorBoundary.tsx`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `src/pages.tsx` to `AuthContext.tsx`, `admin.ts`, `opportunities.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `AuthContext.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _182 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AuthContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1349206349206349 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._