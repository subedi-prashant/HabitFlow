-- ============================================
-- Wallet: Daily Expense Tracker Schema
-- ============================================

-- Enable UUID generation if not already available.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. Enums
-- ============================================

DO $$
BEGIN
  CREATE TYPE public.wallet_entry_type AS ENUM ('Expense', 'Income');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.wallet_category AS ENUM (
    'Food',
    'Transport',
    'Utilities',
    'Shopping',
    'Health',
    'Education',
    'Entertainment',
    'Rent',
    'Savings',
    'Other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.wallet_payment_method AS ENUM (
    'Cash',
    'eSewa',
    'Khalti',
    'Bank Transfer',
    'Card'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. Wallet Entries
-- ============================================

CREATE TABLE IF NOT EXISTS public.wallet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type public.wallet_entry_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category public.wallet_category NOT NULL,
  payment_method public.wallet_payment_method NOT NULL,
  description TEXT DEFAULT '' NOT NULL,
  bs_year INT NOT NULL CHECK (bs_year BETWEEN 2000 AND 3000),
  bs_month INT NOT NULL CHECK (bs_month BETWEEN 1 AND 12),
  bs_day INT NOT NULL CHECK (bs_day BETWEEN 1 AND 32),
  ad_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS wallet_entries_user_id_created_at_idx
  ON public.wallet_entries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wallet_entries_user_id_bs_date_idx
  ON public.wallet_entries (user_id, bs_year DESC, bs_month DESC, bs_day DESC);

CREATE INDEX IF NOT EXISTS wallet_entries_user_id_entry_type_idx
  ON public.wallet_entries (user_id, entry_type);

CREATE POLICY "Users can view their own wallet entries"
  ON public.wallet_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet entries"
  ON public.wallet_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet entries"
  ON public.wallet_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallet entries"
  ON public.wallet_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Keep updated_at fresh on writes.
CREATE OR REPLACE FUNCTION public.set_wallet_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wallet_entries_updated_at ON public.wallet_entries;
CREATE TRIGGER trg_wallet_entries_updated_at
  BEFORE UPDATE ON public.wallet_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_wallet_entries_updated_at();

-- Optional helper view for quick dashboard queries.
CREATE OR REPLACE VIEW public.wallet_entry_summary AS
SELECT
  user_id,
  entry_type,
  category,
  payment_method,
  bs_year,
  bs_month,
  COUNT(*) AS entry_count,
  COALESCE(SUM(amount), 0) AS total_amount
FROM public.wallet_entries
GROUP BY user_id, entry_type, category, payment_method, bs_year, bs_month;

GRANT SELECT ON public.wallet_entry_summary TO authenticated;
