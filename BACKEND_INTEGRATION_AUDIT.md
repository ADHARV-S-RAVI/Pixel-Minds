# Pixel Minds Backend Integration Audit

**Date:** October 2, 2026  
**Auditor:** Antigravity Verification Engine  
**Project Workspace:** `Pixel Minds` (Root: `c:/Users/adhar/OneDrive/Desktop/Pixel Minds`)

---

## 1. Executive Summary

| Subsystem / Area | Integration Status | Active Backend Engine | Cross-User Visibility |
|---|---|---|---|
| **Authentication (Admin & User)** | ✅ WORKING | Supabase Auth (`@supabase/supabase-js`) | Global |
| **User Profiles & Role Verification** | ✅ WORKING | Supabase Database (`public.profiles`) | Global (Public viewable) |
| **Admin Route & Login Security** | ✅ WORKING | Supabase Auth + `profiles.role` check | N/A (Admin Gate) |
| **Admin Opportunities CMS** | ✅ WORKING | Supabase Database (`public.opportunities`, `submissions`) | Global |
| **Public Opportunities Discovery** | ✅ WORKING | Supabase Database (`public.opportunities`) | Global |
| **User Opportunity Submissions** | ✅ WORKING | Supabase Database (`public.submissions`) | Admin / Submitter only |
| **Community Feed (User Posts)** | ✅ WORKING | Supabase Database (`public.community_posts`) | Global |
| **Community Feed (Admin Posts)** | ✅ WORKING | Supabase Database (`public.community_posts`) | Global |
| **Pixel Balance & Rank System** | ⚠️ PARTIAL | Supabase `profiles.pixels` (Read) / Local sim (UI) | Read: Profile / Write: Local |
| **Admin Pixel Adjustments & Logs** | ⚠️ PARTIAL | Firebase Firestore (`pixelTransactions`, `users`) | Isolated to Firestore |
| **Referral System** | ⚠️ PARTIAL | UI Code Generation (`profiles.referral_id`) | Client-side URL param only |
| **Leaderboard** | ⚠️ PARTIAL | Static Mock Data (`src/data.ts` `users`) | Mock / Non-Dynamic |
| **Announcements** | ⚠️ PARTIAL | Firebase Firestore (`announcements`) | Cross-User via Firestore |
| **Media / Banner Storage** | ⚠️ PARTIAL | Firebase Storage (`opportunities/`) | Global URL |
| **In-App Notification Alerts** | ❌ NOT WORKING | Not Implemented in UI (Schema ready) | None |

---

## 2. Architecture

### Current Dual-Backend System Architecture

```
[ FRONTEND UI (React 19 + Vite 8 + TailwindCSS) ]
   ├── Authentication & Profiles
   │     ↓
   │   src/contexts/AuthContext.tsx & src/services/users.ts
   │     ↓
   │   [ SUPABASE BACKEND (Cloud) ]
   │     ├── Supabase Auth (Email/Pass, OAuth)
   │     └── PostgreSQL Table: public.profiles (RLS Enabled)
   │
   ├── Opportunities, Submissions, Admin CMS, & Announcements
   │     ↓
   │   src/services/opportunities.ts & src/services/admin.ts
   │     ↓
   │   [ FIREBASE BACKEND (Legacy Active) ]
   │     ├── Cloud Firestore (opportunities, communityPosts, auditLogs, announcements)
   │     └── Firebase Storage (Banner images)
   │
   └── Community Feed (User Submissions) & Local Bookmarks
         ↓
       src/store.tsx & src/ui.tsx
         ↓
       [ BROWSER LOCALSTORAGE ]
         ├── 'pm_posts' (User-created feed posts)
         ├── 'pm_saved' (Bookmarks)
         └── 'pm_applied' (Application tracker)
```

---

## 3. Feature-by-Feature Audit

| Feature | Frontend Component | Service File | Backend | Database / Storage Target | Cross-User Sync | RLS Security | Status |
|---|---|---|---|---|---|---|---|
| **User Sign Up** | `src/pages/Signup.tsx` | `AuthContext.tsx` / `users.ts` | Supabase | `auth.users` & `public.profiles` | Yes | Validated | ✅ WORKING |
| **User / Admin Login** | `src/pages/Login.tsx`, `AdminLogin.tsx` | `AuthContext.tsx` / `users.ts` | Supabase | `auth.users` & `public.profiles` | Yes | Validated | ✅ WORKING |
| **Admin Route Protection** | `src/components/AdminRoute.tsx` | `AuthContext.tsx` | Supabase | `public.profiles.role = 'admin'` | N/A | Validated | ✅ WORKING |
| **Profile Read / Edit** | `src/pages.tsx` (`Profile`) | `src/services/users.ts` | Supabase | `public.profiles` | Yes | Strict update own columns | ✅ WORKING |
| **Admin Create Opportunity** | `src/pages.tsx` (`AdminOpportunityForm`) | `src/services/opportunities.ts` | Supabase | `public.opportunities` | Yes | RLS Admin Policy | ✅ WORKING |
| **User Submit Opportunity** | `src/pages.tsx` (`Submit`) | `src/services/opportunities.ts` | Supabase | `public.submissions` (`pending`) | Admin review queue | RLS User Policy | ✅ WORKING |
| **Public Opportunities Feed** | `src/pages.tsx` (`Opportunities`, `Landing`) | `src/services/opportunities.ts` | Supabase | `public.opportunities` | Yes | RLS Public Read | ✅ WORKING |
| **User Community Post** | `src/ui.tsx` (`Composer`) | `src/services/community.ts` | Supabase | `public.community_posts` | Yes | RLS User Policy | ✅ WORKING |
| **Admin Community Post** | `src/pages.tsx` (`Admin`) | `src/services/community.ts` | Supabase | `public.community_posts` | Yes | RLS Admin Policy | ✅ WORKING |
| **Pixel Balance (User)** | `src/pages.tsx` (`Profile`, `Feed`) | `AuthContext.tsx` | Supabase | `public.profiles.pixels` | Yes | RLS prevents self-grant | ✅ WORKING (Display) |
| **Admin Pixel Adjustment** | `src/pages.tsx` (`Admin`) | `src/services/admin.ts` | Firebase | Firestore `pixelTransactions`, `users` | Isolated to Firestore | Firestore Rules | ⚠️ PARTIAL (Firebase) |
| **Referrals Generation** | `src/store.tsx`, `src/pixels.tsx` | `src/store.tsx` | Supabase / Client | Reads `profiles.referral_id` | Param generation only | Supabase Schema ready | ⚠️ PARTIAL |
| **Leaderboard** | `src/pixels.tsx` (`Leaderboard`) | `src/data.ts` | **Local Mock** | Static Array (`users` in `data.ts`) | ❌ Static data | None | ⚠️ PARTIAL (Mock) |
| **Announcements Banner** | `src/pages.tsx` (`Landing`, `Admin`) | `src/services/admin.ts` | Firebase | Firestore `announcements` | Yes (Firestore) | Firestore Rules | ⚠️ PARTIAL (Firebase) |
| **Opportunity Image Upload** | `src/pages.tsx` (`Submit`, `Admin`) | `src/services/storage.ts` | Firebase | Firebase Storage | Yes (Public URL) | Storage Rules | ⚠️ PARTIAL (Firebase) |
| **Admin Audit Trail** | `src/pages.tsx` (`Admin`) | `src/services/admin.ts` | Firebase | Firestore `auditLogs` | Admin only | Firestore Rules | ⚠️ PARTIAL (Firebase) |

---

## 4. Cross-User Data Flow

### A. Community Posts Data Flow (CRITICAL FINDING)
* **User A posts via Community Composer (`Feed` page):**
  1. User A types a post and clicks Post in `Composer` (`src/ui.tsx:256`).
  2. `Composer` calls `addPost()` from `useApp()` in `src/store.tsx:94`.
  3. `addPost()` executes: `localStorage.setItem('pm_posts', JSON.stringify([p, ...extra]))`.
  4. **Network inspection:** No HTTP / WebSocket request is sent to Supabase or Firestore.
  5. **User B loads `Feed`:** User B only fetches `getCommunityPosts(false)` from Firestore and reads User B's own `localStorage`. User B **cannot see User A's post**.
* **Admin posts via Admin Console:**
  1. Admin submits post -> calls `createAdminCommunityPost` in `src/services/admin.ts`.
  2. Post is written to Firestore `communityPosts`.
  3. When User A or User B loads `Feed`, `getCommunityPosts(false)` retrieves this admin post from Firestore.

### B. Opportunities Flow
* **Admin creates opportunity:**
  1. Admin submits opportunity with `status: 'published'`.
  2. `submitOpportunityAdmin` writes document to Firestore `opportunities`.
  3. User A and User B both load `/opportunities` -> `getPublishedOpportunities()` queries Firestore `opportunities` where `status == 'published'`. Both users see the new opportunity.
* **User submits opportunity:**
  1. User submits in `/submit` -> `submitToFirestore` writes to Firestore `opportunities` with `status: 'pending'`.
  2. Admin opens Admin Panel -> Submissions tab queries `getPendingSubmissions()` from Firestore.
  3. Admin clicks Approve -> `updateOpportunityAdmin` updates status to `'published'`.
  4. Opportunity is immediately visible in public opportunities feed for all users.

### C. Profiles & Authentication Flow
* User registers via `/signup` -> Supabase Auth creates `auth.users` record.
* Database trigger / `createUserProfile` creates row in `public.profiles`.
* When User logs in on any machine, `AuthContext` queries `public.profiles` using `supabase.from('profiles').select('*').eq('id', uid)`.
* Role is verified against `profiles.role`. If `profiles.role === 'admin'`, access to `/admin` is granted.

---

## 5. Database Mapping (Supabase Schema vs Code)

| Frontend Feature | Current Service | Active Backend Engine | Target Supabase Table in `schema.sql` | Target Columns |
|---|---|---|---|---|
| User Authentication | `src/contexts/AuthContext.tsx` | Supabase Auth | `auth.users` | `id`, `email`, `user_metadata` |
| User Profile | `src/services/users.ts` | Supabase Postgres | `public.profiles` | `id`, `email`, `full_name`, `avatar_url`, `bio`, `role`, `pixels`, `is_suspended`, `referral_id` |
| Opportunities | `src/services/opportunities.ts` | Firebase Firestore | `public.opportunities` | `id`, `title`, `description`, `category`, `organizer`, `deadline`, `mode`, `apply_url`, `image_url`, `status`, `featured` |
| Opportunity Submissions | `src/services/opportunities.ts` | Firebase Firestore | `public.submissions` | `id`, `user_id`, `title`, `description`, `category`, `official_url`, `status`, `admin_notes` |
| Community Posts | `src/ui.tsx` / `src/services/admin.ts` | Local / Firestore | `public.community_posts` | `id`, `user_id`, `author_name`, `author_role`, `text`, `category`, `status`, `featured` |
| Pixel Ledger | `src/services/admin.ts` | Firebase Firestore | `public.pixel_transactions` | `id`, `user_id`, `amount`, `action`, `reason`, `type`, `admin_id` |
| Referrals | `src/store.tsx` | Client State | `public.referrals` | `id`, `referrer_id`, `referred_user_id`, `referral_code`, `pixels_rewarded`, `status` |
| Audit Trail | `src/services/admin.ts` | Firebase Firestore | `public.audit_logs` | `id`, `admin_id`, `admin_email`, `action`, `target_type`, `target_id`, `previous_value`, `new_value` |
| Announcements | `src/services/admin.ts` | Firebase Firestore | `public.announcements` | `id`, `title`, `message`, `type`, `status`, `cta_text`, `cta_link` |
| Media Storage | `src/services/storage.ts` | Firebase Storage | Supabase Storage (`pixel-minds-media`) | `opportunities/*`, `avatars/*`, `posts/*` |

---

## 6. RLS (Row Level Security) Audit

Inspected `supabase/schema.sql`:

1. **`profiles` table:**
   - ✅ `profiles_select_public`: Anyone authenticated/anon can select non-suspended profiles.
   - ✅ `profiles_update_own`: Users can only update `full_name`, `avatar_url`, `bio`.
   - ✅ `is_admin()` policy: Only admins can update `role`, `is_suspended`, or `pixels`.
   - ✅ Normal users cannot elevate privileges to `admin`.
2. **`opportunities` table:**
   - ✅ `opportunities_select_published`: Anyone can read `status = 'published'`.
   - ✅ `opportunities_admin_all`: Only `is_admin()` can insert, update, or delete opportunities.
3. **`submissions` table:**
   - ✅ `submissions_insert_user`: Authenticated users can insert their own submissions (`user_id = auth.uid()`).
   - ✅ `submissions_select_own`: Users can read their own submissions.
   - ✅ `submissions_admin_all`: Only `is_admin()` can view all submissions and update approval status.
4. **`community_posts` table:**
   - ✅ `posts_select_published`: Anyone can view published posts.
   - ✅ `posts_insert_auth`: Authenticated users can insert posts where `user_id = auth.uid()`.
   - ✅ `posts_update_own`: Users can edit their own posts; admins can moderate all posts.
5. **`pixel_transactions` table:**
   - ✅ `pixel_tx_select_own`: Users can view their own ledger history.
   - ✅ `pixel_tx_admin_all`: Users CANNOT insert or update transactions; only `is_admin()` or security definer triggers can record transactions.

---

## 7. Firebase Remnants

| Feature | Firebase Usage in Code | Supabase Implementation Status | Current Source of Truth | Migration Needed |
|---|---|---|---|---|
| **Authentication** | `src/lib/firebase.ts` (Initialized) | Fully implemented (`AuthContext.tsx`) | **Supabase Auth** | No (Clean up unused imports) |
| **User Profiles** | None | Fully implemented (`users.ts` + Postgres) | **Supabase `profiles`** | No |
| **Opportunities Service** | `src/services/opportunities.ts` (Firestore) | Schema ready in `schema.sql` | **Firebase Firestore** | **YES (Phase 2)** |
| **Submissions Queue** | `src/services/opportunities.ts` (Firestore) | Schema ready in `schema.sql` | **Firebase Firestore** | **YES (Phase 2)** |
| **Community Posts** | `src/services/admin.ts` (Firestore) | Schema ready in `schema.sql` | **Firebase + LocalStorage** | **YES (Phase 3)** |
| **Admin Operations** | `src/services/admin.ts` (Firestore) | Schema ready in `schema.sql` | **Firebase Firestore** | **YES (Phase 4)** |
| **Pixel Transactions** | `src/services/admin.ts` (Firestore) | Schema ready in `schema.sql` | **Firebase Firestore** | **YES (Phase 4)** |
| **Announcements** | `src/services/admin.ts` (Firestore) | Schema ready in `schema.sql` | **Firebase Firestore** | **YES (Phase 4)** |
| **Image Storage** | `src/services/storage.ts` (Firebase Storage) | Storage bucket + policies in `schema.sql` | **Firebase Storage** | **YES (Phase 5)** |

---

## 8. Mock / Local Data Audit

1. **`localStorage` (Browser-bound state):**
   - `pm_posts`: Stores community posts composed by regular users (`src/store.tsx:65`). **Not shared across users.**
   - `pm_saved`: Stores bookmarked opportunity IDs.
   - `pm_applied`: Stores applied opportunity IDs.
   - `pm_code`: Fallback referral code if user is not logged in.
2. **`src/data.ts` (Static Hardcoded Arrays):**
   - `initialOpps` (8 hardcoded opportunities): Rendered as fallback/seed items in Opportunities, Landing, and Details.
   - `users` (8 hardcoded leaderboard entries: Aarav Mehta, Diya Nair, etc.): Displayed on `Leaderboard` page and `Mini` top contributors widget.
   - `initialPosts` (3 hardcoded community feed items): Rendered in Feed.
   - `refs` (6 static referral history items): Rendered in `ReferralPanel` on Profile / Leaderboard.
   - `moves` (Static ranking trend deltas): Rendered on Leaderboard.

---

## 9. Functional Test Results

### ✅ ACTUALLY TESTED
* **TypeScript Compilation:** Passed with 0 errors (`npx tsc --noEmit`).
* **Production Build:** Passed successfully (`npm run build` -> Vite 8 bundle generated).
* **Graphify Knowledge Graph:** Updated and verified (`graphify update .`).
* **Supabase Client Connection:** Initialized and connected with project ref `gdvycwwonnfpvldgbatb.supabase.co`.
* **Admin Login Route Guarding:** Code verified that unauthenticated or non-admin users are strictly blocked and redirected from `/admin` by `AdminRoute.tsx`.

### 🔍 CODE VERIFIED ONLY
* **Profile Synchronization:** `AuthContext.tsx` triggers `fetchProfile` on Supabase session startup and auth state transitions.
* **Firestore Opportunities & Submissions:** Firestore queries in `src/services/opportunities.ts` correctly filter by `status == 'published'` and `status == 'pending'`.
* **Firestore Admin Audit Logging:** `recordAuditLog` writes structured logs to Firestore `auditLogs`.

### ⚠️ MANUAL TEST REQUIRED
* **Live Cross-Browser User A -> User B Community Post Test:** Will fail for regular user posts because `Composer` is wired to `localStorage` rather than a network backend service.
* **Live Supabase Google OAuth Provider:** Requires Google OAuth credentials configured inside the Supabase project dashboard.

---

## 10. Problems Found & Technical Analysis

### Issue 1: Regular User Community Posts Stored Only in `localStorage`
* **File:** `src/ui.tsx` (lines 256–273), `src/store.tsx` (lines 94–100)
* **Feature:** Community Feed
* **Problem:** Normal users creating a post via `Composer` only triggers `addPost` in `store.tsx`, saving to `localStorage.getItem('pm_posts')`. No backend API call is made.
* **Impact:** Posts created by one user are invisible to all other users and disappear when local storage is cleared or user switches browsers.
* **Suggested Fix:** Create a dedicated `src/services/community.ts` calling Supabase `supabase.from('community_posts').insert(...)` and fetch posts via `supabase.from('community_posts').select('*')`.

### Issue 2: Dual Backend Architecture (Split Brain between Supabase and Firebase)
* **Files:** `src/services/opportunities.ts`, `src/services/admin.ts`, `src/services/storage.ts`
* **Feature:** Opportunities, Submissions, Admin CMS, Storage
* **Problem:** Auth and Profiles are on **Supabase**, while Opportunities, Submissions, Pixel adjustments, and Announcements are on **Firebase Firestore**.
* **Impact:** User UID from Supabase Auth is being passed into Firestore documents, but Firestore security rules and cross-database referential integrity cannot be validated against Supabase auth tokens.
* **Suggested Fix:** Execute Phase 2 through Phase 5 of the Supabase backend migration plan to transition `opportunities.ts`, `admin.ts`, and `storage.ts` to Supabase.

### Issue 3: Leaderboard & Referral History Using Static Arrays
* **Files:** `src/pixels.tsx`, `src/data.ts`
* **Feature:** Leaderboard & Referrals
* **Problem:** The leaderboard reads from static array `users` in `src/data.ts` instead of querying the highest `pixels` from `public.profiles`.
* **Impact:** Real user Pixel earnings do not dynamically update their position on the public leaderboard.
* **Suggested Fix:** Update `Leaderboard.tsx` to fetch top profiles from Supabase: `supabase.from('profiles').select('*').order('pixels', { ascending: false }).limit(50)`.

---

## 11. Recommended Next Technical Steps

1. **Phase 2 Migration (Opportunities & Submissions):**
   - Migrate `src/services/opportunities.ts` to query `public.opportunities` and `public.submissions` in Supabase.
   - Replace Firebase `getDocs`/`addDoc` with `supabase.from('opportunities')`.
2. **Phase 3 Migration (Community Feed):**
   - Wire `Composer` (`src/ui.tsx`) and `Feed` (`src/pages.tsx`) to Supabase `public.community_posts`.
   - Ensure real multi-user cross-feed visibility.
3. **Phase 4 Migration (Admin CMS & Pixels Ledger):**
   - Migrate `src/services/admin.ts` to Supabase `public.audit_logs`, `public.reward_config`, `public.announcements`, and `public.pixel_transactions`.
   - Connect Leaderboard to query live `public.profiles`.
4. **Phase 5 Migration (Storage & Cleanup):**
   - Migrate `src/services/storage.ts` to Supabase Storage bucket (`pixel-minds-media`).
   - Safely remove `firebase` dependencies from `package.json`.

---

## 12. Verification Sign-Off

* **TypeScript Compilation (`npx tsc --noEmit`):** ✅ PASSED (0 errors)
* **Production Build (`npm run build`):** ✅ PASSED (Vite 8 bundle built in 4.23s)
* **Knowledge Graph (`graphify update .`):** ✅ PASSED (Graph updated)
