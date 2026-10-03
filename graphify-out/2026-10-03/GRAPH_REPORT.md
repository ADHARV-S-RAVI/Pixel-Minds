# Graph Report - Pixel Minds  (2026-10-03)

## Corpus Check
- 69 files · ~47,785 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 494 nodes · 947 edges · 28 communities (25 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 39 edges
2. `react` - 26 edges
3. `Admin()` - 20 edges
4. `compilerOptions` - 18 edges
5. `compilerOptions` - 15 edges
6. `useApp()` - 13 edges
7. `Pixel Minds Backend Integration Audit` - 13 edges
8. `recordAuditLog()` - 12 edges
9. `supabase` - 11 edges
10. `useApp()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `AuthContextType` --references--> `User`  [EXTRACTED]
  src/contexts/AuthContext.tsx → src/types/index.ts
- `recordReferralSignup()` --calls--> `getRewardConfig()`  [EXTRACTED]
  src/services/referrals.ts → src/services/pixels.ts
- `AdminCMS()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages.tsx → src/contexts/AuthContext.tsx
- `AdminOpportunityForm()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages.tsx → src/contexts/AuthContext.tsx
- `MySubmissions()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/MySubmissions.tsx → src/contexts/AuthContext.tsx

## Import Cycles
- 2-file cycle: `src/services/admin.ts -> src/services/announcements.ts -> src/services/admin.ts`

## Communities (28 total, 3 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.08
Nodes (40): react, App(), AdminRoute(), Footer(), Navbar(), PixelMark(), ProtectedRoute(), AuthContext (+32 more)

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

### Community 8 - "src/ui.tsx"
Cohesion: 0.07
Nodes (39): cats, FeedPost, initialOpps, initialPosts, LeaderboardUser, moves, Opp, opps (+31 more)

### Community 10 - "opportunities.ts"
Cohesion: 0.12
Nodes (29): Admin(), AdminTab, STATUS_OPTIONS, AdminCMS(), AdminOpportunityForm(), MySubmissions(), OppDetail(), CATEGORIES (+21 more)

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
Cohesion: 0.09
Nodes (42): AnnouncementBanner(), adminTabs, Admin(), AdminMetrics, createAdminCommunityPost(), deleteCommunityPost(), getAuditLogs(), recordAuditLog() (+34 more)

### Community 25 - "Pixel Minds Backend Integration Audit"
Cohesion: 0.08
Nodes (23): 10. Problems Found & Technical Analysis, 11. Recommended Next Technical Steps, 12. Verification Sign-Off, 1. Executive Summary, 2. Architecture, 3. Feature-by-Feature Audit, 4. Cross-User Data Flow, 5. Database Mapping (Supabase Schema vs Code) (+15 more)

### Community 26 - "Phase 3: Community Posts & Feed Supabase Migration Report"
Cohesion: 0.29
Nodes (6): 1. Summary of Migration, 2. Files Changed & Added, 3. RLS & Security Status, 4. Dependencies Removed, 5. Verification & Quality Checks, Phase 3: Community Posts & Feed Supabase Migration Report

### Community 27 - "Pixel Minds - Auth & Profile Completion Update Report"
Cohesion: 0.20
Nodes (9): 1. Summary of Changes, 2. Files Changed & Created, 3. Flows & Logic, 4. Supabase Database Migration (Manual SQL), 5. Verification Results, A. Password Recovery Flow, B. Change Password Flow (Authenticated), C. Signup Details Flow (+1 more)

## Knowledge Gaps
- **179 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+174 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `useAuth` to `pixel-minds/src/pages.tsx`, `plugins`, `src/ui.tsx`, `opportunities.ts`, `src/pages.tsx`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `useAuth` to `src/pages.tsx`, `src/ui.tsx`, `opportunities.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `useAuth`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _179 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.08087431693989071 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._