# Phase 4A: Pixel Rewards & Transaction Ledger Supabase Migration Report

## 1. Overview & Objectives Achieved
Phase 4A migrated Pixel balances, transaction history, reward configuration, and admin pixel management completely from Firebase/localStorage to **Supabase PostgreSQL** without modifying the visual design, Auth, Google OAuth, Opportunities, or Community Posts:

1. **Pixel Balance Migration:** User Pixel balance is stored and fetched from `public.profiles.pixels`.
2. **Immutable Transaction Ledger:** Every balance change is recorded in `public.pixel_transactions` with an action, reason, amount (+/-), and admin ID if applicable.
3. **Trigger-driven Balance Updates:** PostgreSQL trigger `handle_pixel_transaction()` securely recalculates user balances upon ledger insert (`SET pixels = GREATEST(0, pixels + NEW.amount)`).
4. **Centralized Reward Config:** Reward points for sharing, submitting, and contributing are stored and retrieved dynamically from `public.reward_config`.
5. **Admin Pixel & Reward Control:** Admin can configure reward values in real time and execute pixel awards/deductions with a mandatory reason.
6. **User Pixel Ledger in UI:** Users can view their real Supabase transaction history directly under their Profile.
7. **Security & RLS:** Regular users cannot arbitrarily alter their balance from the client.

---

## 2. Files Changed & Created

| File | Status | Description |
|------|--------|-------------|
| [`src/services/pixels.ts`](file:///c:/Users/adhar/OneDrive/Desktop/Pixel%20Minds/src/services/pixels.ts) | **Created** | Core Supabase service for fetching/adjusting Pixel balances, querying transaction ledgers, managing reward config, and fetching users. |
| [`src/services/admin.ts`](file:///c:/Users/adhar/OneDrive/Desktop/Pixel%20Minds/src/services/admin.ts) | **Modified** | Re-exports and routes all Pixel adjustment, transaction logging, reward config, and user moderation calls to Supabase. |
| [`src/types/index.ts`](file:///c:/Users/adhar/OneDrive/Desktop/Pixel%20Minds/src/types/index.ts) | **Modified** | Updated `RewardConfig` and `PixelTransaction` interfaces. |
| [`src/pages.tsx`](file:///c:/Users/adhar/OneDrive/Desktop/Pixel%20Minds/src/pages.tsx) | **Modified** | Connected Admin Pixel/Rewards panel to Supabase and added the **Pixel History** transaction ledger tab to the authenticated user Profile. |
| [`src/ui.tsx`](file:///c:/Users/adhar/OneDrive/Desktop/Pixel%20Minds/src/ui.tsx) | **Modified** | Updated user navbar dropdown balance to read directly from Supabase `userProfile.pixels`. |

---

## 3. Data Flow & Architecture

### A. User Pixel Balance & History
- **Balance:** `public.profiles.pixels` (Default: 0).
- **History:** Loaded via `getPixelTransactions(user.uid)` from `public.pixel_transactions`.
- **Display:** Displayed in navbar avatar dropdown, leaderboard header, profile overview cards, and the profile **Pixel History** tab.

### B. Admin Pixel Adjustments
1. Admin selects a user in **Admin > Users & Pixels**, inputs an adjustment amount (positive or negative) and a mandatory reason.
2. `adjustUserPixels()` inserts a record into `public.pixel_transactions`:
   ```json
   {
     "user_id": "<target_user_id>",
     "amount": 25,
     "action": "Admin Award (+25 Pixels)",
     "reason": "Hackathon submission bonus",
     "type": "adjustment",
     "admin_id": "<admin_uid>"
   }
   ```
3. Supabase trigger `handle_pixel_transaction()` automatically updates `public.profiles.pixels`.

### C. Reward Configuration
- Stored as a singleton row in `public.reward_config` (`id = 'rewards'`).
- Admin updates values in **Admin > Reward Config** &rarr; saved via `updateRewardConfig()`.
- Public components dynamically read reward config via `getRewardConfig()`.

---

## 4. Manual Supabase SQL Check (If Tables Do Not Already Exist)

The schema in `supabase/schema.sql` defines the required tables. If running in a fresh Supabase environment, run this in the **Supabase SQL Editor**:

```sql
-- 1. Create Pixel Transactions Ledger
CREATE TABLE IF NOT EXISTS public.pixel_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'adjustment')),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pixel_transactions_user_id ON public.pixel_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pixel_transactions_created_at ON public.pixel_transactions(created_at DESC);

-- 2. Create Reward Config Table
CREATE TABLE IF NOT EXISTS public.reward_config (
  id TEXT PRIMARY KEY DEFAULT 'rewards',
  share_opportunity INTEGER NOT NULL DEFAULT 10,
  submit_opportunity INTEGER NOT NULL DEFAULT 20,
  approved_opportunity INTEGER NOT NULL DEFAULT 50,
  referral_signup INTEGER NOT NULL DEFAULT 25,
  valid_report INTEGER NOT NULL DEFAULT 15,
  daily_activity INTEGER NOT NULL DEFAULT 5,
  profile_completion INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.reward_config (id, share_opportunity, submit_opportunity, approved_opportunity, referral_signup, valid_report, daily_activity, profile_completion)
VALUES ('rewards', 10, 20, 50, 25, 15, 5, 10)
ON CONFLICT (id) DO NOTHING;

-- 3. Trigger: Automatically update profile balance on transaction insert
CREATE OR REPLACE FUNCTION public.handle_pixel_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    pixels = GREATEST(0, pixels + NEW.amount),
    updated_at = timezone('utc'::text, now())
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_pixel_transaction ON public.pixel_transactions;
CREATE TRIGGER tr_on_pixel_transaction
AFTER INSERT ON public.pixel_transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_pixel_transaction();
```

---

## 5. Verification Results
1. **TypeScript Typecheck:** `npx tsc --noEmit` &rarr; **Passed (0 errors)**.
2. **Production Build:** `npm run build` &rarr; **Passed (0 errors in 3.02s)**.
3. **Graphify Knowledge Graph:** `graphify update .` &rarr; **Rebuilt (475 nodes, 895 edges across 28 communities)**.
