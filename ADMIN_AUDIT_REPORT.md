# Admin Dashboard Audit & Security Report: Pixel Minds

**Date:** October 18, 2026  
**Auditor:** Antigravity AI  
**Repository:** Pixel Minds  
**Scope:** Admin Dashboard, Notification Delivery, Submission Approval Workflow, RLS Security, and End-to-End Testing  

---

## 1. Executive Summary

A comprehensive audit was conducted across the Pixel Minds Admin Dashboard, Supabase integration, notification triggers, and client-side administrative controls. 

- **Approval & Rejection Notifications:** Fixed submission review handler in [opportunities.ts](file:///c:/Users/adhar/OneDrive/Desktop/Pixel%20Minds/src/services/opportunities.ts) to gracefully catch notification delivery issues so that database status updates are never misreported as failures. Ensured re-approvals update existing opportunity records instead of inserting duplicate rows.
- **RPC Alignment:** Verified that the parameters passed to `send_notification_rpc` (`p_title`, `p_message`, `p_type`, `p_link`, `p_target_user_id`, `p_admin_id`) and `delete_notification_rpc` (`p_notification_id`) in [notifications.ts](file:///c:/Users/adhar/OneDrive/Desktop/Pixel%20Minds/src/services/notifications.ts) match the live Supabase database definitions.
- **Security & RLS Audit:** Tested live Supabase Row-Level Security policies. Confirmed unauthenticated users cannot read submissions, cannot execute admin notification RPCs, cannot insert into `audit_logs`, and cannot inspect recipient user notifications.
- **Automated Verification:** Ran automated Playwright browser tests across all application routes, forms, and permission gates. Executed `npx tsc --noEmit` (0 errors), `npm run build` (successful production bundle in 2.69s), and updated the AST knowledge graph via `graphify update .`.

---

## 2. Features Inspected & Audit Findings

### A. User Management (`Users & Pixels` Tab)
- **View & Search:** Sourced via `getAllUsersAdmin()` from `public.profiles`. Real-time search filter checks display names, emails, and roles.
- **Account Actions:** 
  - **Suspension Toggle:** Invokes `toggleUserSuspension()`, modifying `is_suspended` on `public.profiles` and appending an entry to `audit_logs`.
  - **Pixel Adjustment:** Opens modal requiring an explicit adjustment reason. Executes `adjustUserPixels()` which creates an immutable record in `public.pixel_transactions` and updates profile balances. No client-side balance manipulation is permitted.
- **Permissions:** Restricted by `AdminRoute` check (`userProfile?.role === 'admin'`).

### B. Opportunity Management (`Opportunities` Tab)
- **Catalog & Actions:** Displays all opportunities via `getAllOpportunities()` with category and status dropdown filters.
- **Lifecycle Operations:** Supports full Creation, Editing, Publishing, Unpublishing, and Deletion (`deleteOpportunityAdmin()`). Changes persist in Supabase `public.opportunities`.
- **Image & External Links:** Validated official application URLs, category tags, and image upload routing.

### C. Submission Management (`Submissions` Tab)
- **Review Queue:** Fetches submissions in `pending` status using `getPendingSubmissions()`, populating submitter name and email from `profiles`.
- **Detail Inspection:** `SubmissionDetailModal` displays comprehensive submission information (organizer, location, mode, prize, eligibility, skills, and full description).
- **Approval Workflow:** Approving creates or updates the public opportunity row in `public.opportunities`, marks `submissions.status = 'approved'`, records `reviewed_by`, links `opportunity_id`, and dispatches an in-app notification linking to `/opportunities/${createdOpp.id}`.
- **Rejection Workflow:** Rejection opens a dedicated modal allowing optional reviewer notes/reasons, updates `submissions.status = 'rejected'`, records `admin_notes`, and dispatches a rejection notification linking to `/profile?tab=My+Submissions&id=${submissionId}`.
- **Protection:** Unauthorized visitors are prevented from querying or updating submissions by RLS policy `auth.uid() = user_id OR public.is_admin()`.

### D. Notifications (`Notifications` Tab & `NotificationBell`)
- **Notification Delivery:** Dispatches via `sendAdminNotification()` using `send_notification_rpc` with security definer validation.
- **Broadcast & Targeted:** Supports broadcast to "Everyone" or targeted single-user delivery via user selection dropdown.
- **Sent History & Cascading Deletion:** History table queries `notifications` and joins recipient statistics. Deleting a notification via `deleteAdminNotification()` calls `delete_notification_rpc`, purging both the master record and all recipient mappings in `user_notifications`.
- **Notification Bell UI:** [NotificationBell.tsx](file:///c:/Users/adhar/OneDrive/Desktop/Pixel%20Minds/src/components/NotificationBell.tsx) provides real-time Supabase Postgres changes subscription, an 8-second polling fallback, and window event listener (`pm:notification-update`) to update unread counts immediately upon admin actions.
- **Access Control:** Verified ordinary users cannot invoke `send_notification_rpc` or `delete_notification_rpc`.

### E. Announcements (`Announcements` Tab)
- **Creation & Banners:** Supports title, message, CTA button, destination URL, and banner image upload (`uploadAnnouncementImage()`) to Supabase Storage.
- **Separation:** Announcements reside in `public.announcements` table, remaining distinct from user notifications. Displayed as active alerts/modals on the landing page.

### F. Community Management (`Community Posts` Tab)
- **Feed Moderation:** Displays all posts via `getCommunityPosts(true)`. Admin can publish official updates to the community feed and delete reported/inappropriate posts via `deleteCommunityPost()`. Every moderation action is tracked in `audit_logs`.

### G. Analytics & Dashboard Overview (`Overview` Tab)
- **Metrics Accuracy:** Total Users, Published Opportunities, Pending Submissions, Community Posts, Total Views, Apply Clicks, and Pixels Issued are computed dynamically from live database queries rather than hardcoded mock figures.

---

## 3. Bugs Identified & Fixes Applied

| # | Bug Description | Root Cause | Fix Applied |
|---|-----------------|------------|-------------|
| 1 | Approval/Rejection reported as failed if notification trigger failed | `updateOpportunityAdmin` re-threw notification error after database status update, causing UI to show "Failed to update submission status" | Notification dispatch wrapped in `try/catch`, logging errors gracefully without failing the approval/rejection operation |
| 2 | Potential duplicate opportunities created on repeated approval | `updateOpportunityAdmin` always executed `supabase.from('opportunities').insert(...)` even if `submission.status === 'approved'` | Checks if `submission.opportunity_id` already exists; if present, updates the existing opportunity row instead of duplicating |
| 3 | `.env` file not ignored by Git | `.env` was missing from `.gitignore` | Added `.env` and `.env.*` to [.gitignore](file:///c:/Users/adhar/OneDrive/Desktop/Pixel%20Minds/.gitignore) |
| 4 | Notification deduplication failure on rapid retry | Duplicate checks previously relied on joins that could fail under specific RLS states | Simplified notification deduplication check in `createReviewNotification` using two-step query |

---

## 4. Security Audit Matrix

| Security Check | Mechanism | Verification Result |
|----------------|-----------|---------------------|
| Protected Admin Routes (`/admin`, `/console`) | `AdminRoute` component (`userProfile?.role === 'admin'`) | **PASS** - Unauthenticated visitors immediately redirected to `/admin/login` |
| Protected User Routes (`/submit`, `/profile`) | `ProtectedRoute` component | **PASS** - Unauthenticated visitors redirected to `/login` |
| `send_notification_rpc` Execution | `public.is_admin()` check inside SECURITY DEFINER function | **PASS** - Non-admin / anon execution rejected with `permission denied` (Code: 42501) |
| `delete_notification_rpc` Execution | `public.is_admin()` check inside SECURITY DEFINER function | **PASS** - Non-admin execution rejected with `permission denied` |
| Direct `audit_logs` Writes | RLS Policy `USING (public.is_admin())` | **PASS** - Unauthorized INSERT rejected with `permission denied` |
| Submissions Table Privacy | RLS Policy `auth.uid() = user_id OR public.is_admin()` | **PASS** - Anonymous SELECT yields 0 rows / access denied |
| User Notifications Privacy | RLS Policy `auth.uid() = user_id OR public.is_admin()` | **PASS** - Anonymous SELECT yields 0 rows |
| Client Secrets Exposure | Source inspection | **PASS** - No `service_role` keys or secrets in frontend bundle |

---

## 5. Automated Build & Test Results

- **Playwright Test Execution:**  
  `node scripts/audit-test.mjs`  
  - 17 Automated checks passed (public route rendering, admin route guards, form validations, RLS access restrictions).
- **TypeScript Typecheck:**  
  `npx tsc --noEmit`  
  - Result: **0 errors** (Exit code 0).
- **Production Bundle:**  
  `npm run build`  
  - Result: **Built successfully in 2.69s** (Vite v8.3.1 / Rolldown).
- **Graphify Knowledge Graph:**  
  `graphify update .`  
  - Result: Rebuilt 529 nodes, 1036 edges, 31 communities across `graphify-out/`.

---

## 6. Features Requiring Manual Verification (Multi-Account Scenarios)

Because automated testing was performed using the anonymous and test roles without destructive changes to production accounts, the following end-to-end interactions should be verified with live user credentials:

1. **Live Admin Approval Notification Toast:** Log in with a verified admin account (`admin@pixelminds.org`), approve a pending submission, and verify on a separate browser window logged in as the submitter that the unread bell badge increments from `0` to `1` in real-time.
2. **User Suspension Real-Time Logout:** In the `Users & Pixels` tab, click "Suspend" on a test account and verify that the target user's session reflects suspension.
3. **Broadcast Notification Received by All Logged-in Users:** Compose a notification targeted to "Everyone" and verify real-time reception across two simultaneously active browser sessions.

---

## 7. Remaining Known Issues & Supabase Recommendations

- **Supabase RLS on Anonymous Opportunity Reads (`is_admin` Permission):**  
  In the live Supabase database, public tables (`opportunities`, `announcements`, `community_posts`) have RLS policies with expressions like `USING (status = 'published' OR public.is_admin())`. When unauthenticated visitors query these tables, PostgreSQL attempts to resolve the permissions for `public.is_admin()`. Because execute permission was not granted to the `anon` role, queries from unauthenticated visitors log:  
  `code: 42501, message: 'permission denied for function is_admin'`  
  *Recommended Resolution (Safe 1-line SQL in Supabase SQL Editor):*  
  ```sql
  GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
  ```  
  *Explanation:* For anonymous callers, `auth.uid()` is `NULL`, so `is_admin()` safely returns `FALSE` without leaking data or granting any privileges, allowing the `status = 'published'` clause to evaluate normally for public visitors.
