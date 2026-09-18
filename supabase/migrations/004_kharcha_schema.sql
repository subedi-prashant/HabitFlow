CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.kharcha_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NPR' CHECK (currency = 'NPR'),
  source TEXT NOT NULL CHECK (source IN ('NIMB', 'NIC_ASIA', 'ESEWA', 'MANUAL')),
  channel TEXT NOT NULL CHECK (channel IN ('merchant_payment', 'qr_payment', 'bank_transfer', 'wallet_top_up', 'card_payment', 'cash_withdrawal', 'fee', 'cash', 'other')),
  category TEXT NOT NULL DEFAULT 'Other' CHECK (category IN ('Food & Drink', 'Transport', 'Bills & Utilities', 'Shopping', 'Health', 'Education', 'Entertainment', 'Housing', 'Travel', 'Transfers', 'Cash Withdrawal', 'Fees', 'Other')),
  merchant TEXT NOT NULL DEFAULT '' CHECK (char_length(merchant) <= 120),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  external_transaction_id TEXT CHECK (external_transaction_id IS NULL OR char_length(external_transaction_id) BETWEEN 1 AND 120),
  gmail_message_id TEXT CHECK (gmail_message_id IS NULL OR char_length(gmail_message_id) BETWEEN 1 AND 255),
  occurred_at TIMESTAMPTZ NOT NULL,
  occurred_on DATE NOT NULL,
  bs_year INT NOT NULL CHECK (bs_year BETWEEN 2000 AND 3000),
  bs_month INT NOT NULL CHECK (bs_month BETWEEN 1 AND 12),
  bs_day INT NOT NULL CHECK (bs_day BETWEEN 1 AND 32),
  ingestion_method TEXT NOT NULL CHECK (ingestion_method IN ('email', 'manual')),
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'reversed', 'excluded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kharcha_transactions_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT kharcha_transactions_provenance_check CHECK (
    (ingestion_method = 'manual' AND source = 'MANUAL' AND gmail_message_id IS NULL)
    OR
    (ingestion_method = 'email' AND source <> 'MANUAL' AND gmail_message_id IS NOT NULL)
  )
);

CREATE TABLE public.kharcha_ingestion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL CHECK (char_length(gmail_message_id) BETWEEN 1 AND 255),
  sender TEXT NOT NULL CHECK (char_length(sender) BETWEEN 1 AND 320),
  subject TEXT NOT NULL DEFAULT '' CHECK (char_length(subject) <= 500),
  received_at TIMESTAMPTZ NOT NULL,
  source TEXT CHECK (source IS NULL OR source IN ('NIMB', 'NIC_ASIA', 'ESEWA')),
  status TEXT NOT NULL CHECK (status IN ('processed', 'duplicate', 'needs_review', 'unsupported', 'failed')),
  reason TEXT NOT NULL DEFAULT '' CHECK (char_length(reason) <= 500),
  transaction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kharcha_ingestion_events_user_message_key UNIQUE (user_id, gmail_message_id),
  CONSTRAINT kharcha_ingestion_events_transaction_user_fkey
    FOREIGN KEY (transaction_id, user_id)
    REFERENCES public.kharcha_transactions(id, user_id)
    ON DELETE CASCADE
);

CREATE TABLE public.kharcha_sync_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_checked_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error TEXT CHECK (last_error IS NULL OR char_length(last_error) <= 500),
  consecutive_failures INT NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX kharcha_transactions_user_gmail_message_idx
  ON public.kharcha_transactions (user_id, gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;

CREATE UNIQUE INDEX kharcha_transactions_user_source_external_idx
  ON public.kharcha_transactions (user_id, source, external_transaction_id)
  WHERE external_transaction_id IS NOT NULL;

CREATE INDEX kharcha_transactions_user_occurred_at_idx
  ON public.kharcha_transactions (user_id, occurred_at DESC);

CREATE INDEX kharcha_transactions_user_status_source_idx
  ON public.kharcha_transactions (user_id, status, source);

CREATE INDEX kharcha_transactions_user_bs_date_idx
  ON public.kharcha_transactions (user_id, bs_year DESC, bs_month DESC, bs_day DESC);

CREATE INDEX kharcha_ingestion_events_user_status_received_idx
  ON public.kharcha_ingestion_events (user_id, status, received_at DESC);

ALTER TABLE public.kharcha_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kharcha_ingestion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kharcha_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own kharcha transactions"
  ON public.kharcha_transactions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own manual kharcha transactions"
  ON public.kharcha_transactions FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND ingestion_method = 'manual'
    AND source = 'MANUAL'
    AND gmail_message_id IS NULL
  );

CREATE POLICY "Users can update their own kharcha transactions"
  ON public.kharcha_transactions FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own manual kharcha transactions"
  ON public.kharcha_transactions FOR DELETE
  USING ((SELECT auth.uid()) = user_id AND ingestion_method = 'manual');

CREATE POLICY "Users can view their own kharcha ingestion events"
  ON public.kharcha_ingestion_events FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own kharcha sync state"
  ON public.kharcha_sync_state FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kharcha_transactions TO authenticated;
GRANT SELECT ON public.kharcha_ingestion_events TO authenticated;
GRANT SELECT ON public.kharcha_sync_state TO authenticated;

CREATE OR REPLACE FUNCTION public.set_kharcha_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER set_kharcha_transactions_updated_at
  BEFORE UPDATE ON public.kharcha_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_kharcha_updated_at();

CREATE TRIGGER set_kharcha_ingestion_events_updated_at
  BEFORE UPDATE ON public.kharcha_ingestion_events
  FOR EACH ROW EXECUTE FUNCTION public.set_kharcha_updated_at();

CREATE TRIGGER set_kharcha_sync_state_updated_at
  BEFORE UPDATE ON public.kharcha_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.set_kharcha_updated_at();
