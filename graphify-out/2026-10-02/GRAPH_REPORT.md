# Graph Report - Pixel Minds  (2026-10-01)

## Corpus Check
- 53 files · ~24,010 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 372 nodes · 662 edges · 24 communities (21 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- useAuth
- compilerOptions
- AuthContext.tsx
- devDependencies
- compilerOptions
- pixel-minds/src/pages.tsx
- package.json
- plugins
- src/pages.tsx
- tsconfig.json
- opportunities.ts
- devDependencies
- compilerOptions
- React + TypeScript + Vite
- rules/graphify.md
- workflows/graphify.md

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 29 edges
2. `react` - 22 edges
3. `compilerOptions` - 18 edges
4. `compilerOptions` - 15 edges
5. `useApp()` - 13 edges
6. `useApp()` - 9 edges
7. `compilerOptions` - 9 edges
8. `OppDetail()` - 8 edges
9. `getCategoryMeta()` - 8 edges
10. `grad()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Feed()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages.tsx → src/contexts/AuthContext.tsx
- `OpportunityDetails()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/OpportunityDetails.tsx → src/contexts/AuthContext.tsx
- `Submit()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages.tsx → src/contexts/AuthContext.tsx
- `SubmitOpportunity()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/SubmitOpportunity.tsx → src/contexts/AuthContext.tsx
- `Leaderboard()` --calls--> `useAuth()`  [EXTRACTED]
  src/pixels.tsx → src/contexts/AuthContext.tsx

## Import Cycles
- None detected.

## Communities (24 total, 3 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.13
Nodes (20): react, App(), AdminRoute(), Footer(), Navbar(), PixelMark(), ProtectedRoute(), useAuth() (+12 more)

### Community 1 - "compilerOptions"
Cohesion: 0.08
Nodes (23): vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module (+15 more)

### Community 2 - "AuthContext.tsx"
Cohesion: 0.15
Nodes (19): AuthContext, AuthContextType, AuthProvider(), app, auth, db, firebaseConfig, googleProvider (+11 more)

### Community 3 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, oxlint, devDependencies, autoprefixer, oxlint, postcss, tailwindcss, @types/node (+13 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 5 - "pixel-minds/src/pages.tsx"
Cohesion: 0.06
Nodes (51): App(), cats, moves, Opp, opps, posts, rankOf(), refs (+43 more)

### Community 6 - "package.json"
Cohesion: 0.09
Nodes (22): firebase, dependencies, firebase, lucide-react, react, react-dom, react-router-dom, @tailwindcss/postcss (+14 more)

### Community 7 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 8 - "src/pages.tsx"
Cohesion: 0.08
Nodes (40): cats, FeedPost, initialOpps, initialPosts, LeaderboardUser, moves, Opp, opps (+32 more)

### Community 10 - "opportunities.ts"
Cohesion: 0.14
Nodes (23): Admin(), AdminTab, STATUS_OPTIONS, OppDetail(), CATEGORIES, Opportunities(), OpportunityDetails(), Admin() (+15 more)

### Community 15 - "devDependencies"
Cohesion: 0.06
Nodes (32): dependencies, lucide-react, react, react-dom, react-router-dom, devDependencies, tailwindcss, @tailwindcss/vite (+24 more)

### Community 16 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+5 more)

### Community 17 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

## Knowledge Gaps
- **130 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+125 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `useAuth` to `AuthContext.tsx`, `pixel-minds/src/pages.tsx`, `plugins`, `src/pages.tsx`, `opportunities.ts`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `useAuth`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `useAuth` to `src/pages.tsx`, `AuthContext.tsx`, `opportunities.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _130 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.1268939393939394 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `AuthContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14855072463768115 - nodes in this community are weakly interconnected._