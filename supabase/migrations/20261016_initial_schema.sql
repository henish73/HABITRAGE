-- ========================================================
-- FinanceOS Supabase Schema & Initial Migration
-- Free forever Postgres setup with pgvector & RLS
-- ========================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('bank', 'credit_card')),
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  credit_limit NUMERIC(12, 2) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  merchant TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  amount NUMERIC(12, 2) NOT NULL,
  debit NUMERIC(12, 2) NULL,
  credit NUMERIC(12, 2) NULL,
  running_balance NUMERIC(12, 2) NULL,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'pending')),
  cheque_number TEXT NULL,
  foreign_spend_amount NUMERIC(12, 2) NULL,
  commission NUMERIC(12, 2) NULL,
  exchange_rate NUMERIC(12, 6) NULL,
  additional_info TEXT NULL,
  address TEXT NULL,
  city_province TEXT NULL,
  country TEXT NULL,
  reference_number TEXT NULL,
  source_file TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes on Transactions for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON public.transactions(merchant);

-- 3. Bills & Reminders Table
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rent', 'credit_card', 'utility', 'subscription', 'other')),
  amount NUMERIC(12, 2) NOT NULL,
  due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'weekly', 'biweekly')),
  linked_account_id UUID NULL REFERENCES public.accounts(id) ON DELETE SET NULL,
  autopay BOOLEAN NOT NULL DEFAULT FALSE,
  next_due_date DATE NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_next_due_date ON public.bills(next_due_date);

-- 4. Credit Reports Table
CREATE TABLE IF NOT EXISTS public.credit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau TEXT NOT NULL CHECK (bureau IN ('Equifax', 'TransUnion', 'Borrowell')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  score INT NOT NULL CHECK (score BETWEEN 300 AND 900),
  utilization_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  total_debt NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  open_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  closed_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  inquiries JSONB NOT NULL DEFAULT '[]'::jsonb,
  derogatories JSONB NOT NULL DEFAULT '[]'::jsonb,
  extracted_text TEXT NULL,
  extracted_json JSONB NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AI Chat History Table
CREATE TABLE IF NOT EXISTS public.ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  function_calls JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. pgvector Semantic Search Table for Transactions
CREATE TABLE IF NOT EXISTS public.transaction_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  embedding vector(768), -- Gemini text-embedding-004 dimension
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_embeddings ON public.transaction_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 7. Supabase Storage: credit-reports bucket setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('credit-reports', 'credit-reports', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Row Level Security Policies (RLS)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and service_role full access (for single-user / multi-tenant personal OS)
CREATE POLICY "Allow all actions for user" ON public.accounts FOR ALL USING (true);
CREATE POLICY "Allow all actions for user" ON public.transactions FOR ALL USING (true);
CREATE POLICY "Allow all actions for user" ON public.bills FOR ALL USING (true);
CREATE POLICY "Allow all actions for user" ON public.credit_reports FOR ALL USING (true);
CREATE POLICY "Allow all actions for user" ON public.ai_chat_history FOR ALL USING (true);
