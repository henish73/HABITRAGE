-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL DEFAULT 'owner',
    "type" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_type" TEXT NOT NULL,
    "opening_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "credit_limit" DECIMAL(14,2),
    "apr" DECIMAL(7,6),
    "due_date" TEXT,
    "minimum_payment" DECIMAL(14,2),
    "statement_closing_date" TEXT,
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL DEFAULT 'owner',
    "account_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "merchant" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'General',
    "type" TEXT DEFAULT 'Outflow',
    "amount" DECIMAL(14,2) NOT NULL,
    "debit" DECIMAL(14,2),
    "credit" DECIMAL(14,2),
    "running_balance" DECIMAL(14,2),
    "status" TEXT NOT NULL DEFAULT 'posted',
    "cheque_number" TEXT,
    "foreign_spend_amount" DECIMAL(14,2),
    "commission" DECIMAL(14,2),
    "exchange_rate" DECIMAL(14,6),
    "additional_info" TEXT,
    "address" TEXT,
    "city_province" TEXT,
    "country" TEXT,
    "reference_number" TEXT,
    "source_file" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "exclude_from_reports" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "import_batch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL DEFAULT 'owner',
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL DEFAULT 'owner',
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "due_day" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "linked_account_id" TEXT,
    "autopay" BOOLEAN NOT NULL DEFAULT false,
    "next_due_date" TEXT NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_reports" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL DEFAULT 'owner',
    "bureau" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "utilization_percent" DECIMAL(5,2) NOT NULL,
    "total_debt" DECIMAL(14,2) NOT NULL,
    "open_accounts" JSONB NOT NULL,
    "closed_accounts" JSONB NOT NULL,
    "inquiries" JSONB NOT NULL,
    "derogatories" JSONB NOT NULL,
    "extracted_text" TEXT,
    "extracted_json" JSONB,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_history" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL DEFAULT 'owner',
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "function_calls" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_sources" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL DEFAULT 'owner',
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "frequency" TEXT NOT NULL,
    "next_date" TEXT NOT NULL,
    "account_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "reset_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "accounts_owner_id_idx" ON "accounts"("owner_id");

-- CreateIndex
CREATE INDEX "transactions_owner_id_account_id_date_idx" ON "transactions"("owner_id", "account_id", "date");

-- CreateIndex
CREATE INDEX "transactions_owner_id_date_idx" ON "transactions"("owner_id", "date");

-- CreateIndex
CREATE INDEX "transactions_owner_id_status_idx" ON "transactions"("owner_id", "status");

-- CreateIndex
CREATE INDEX "transactions_owner_id_deleted_at_idx" ON "transactions"("owner_id", "deleted_at");

-- CreateIndex
CREATE INDEX "transactions_account_id_idx" ON "transactions"("account_id");

-- CreateIndex
CREATE INDEX "transactions_category_idx" ON "transactions"("category");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "categories_owner_id_idx" ON "categories"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_owner_id_name_key" ON "categories"("owner_id", "name");

-- CreateIndex
CREATE INDEX "bills_owner_id_idx" ON "bills"("owner_id");

-- CreateIndex
CREATE INDEX "credit_reports_owner_id_idx" ON "credit_reports"("owner_id");

-- CreateIndex
CREATE INDEX "ai_chat_history_owner_id_idx" ON "ai_chat_history"("owner_id");

-- CreateIndex
CREATE INDEX "income_sources_owner_id_idx" ON "income_sources"("owner_id");

-- CreateIndex
CREATE INDEX "rate_limits_reset_at_idx" ON "rate_limits"("reset_at");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_linked_account_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_sources" ADD CONSTRAINT "income_sources_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
