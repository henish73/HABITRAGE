# FinanceOS - Autonomous Personal Finance Operating System

> **Web + Android + iOS from ONE codebase.** Free forever personal finance OS managing your entire financial life with **4,158 real reconciled transactions** across Canadian bank accounts and credit cards.

---

## 🏛️ Accounts & Credit Facilities Included

FinanceOS is seeded directly from your reconciled bank and credit card files:

### **Bank Accounts**
1. **CIBC Smart Account** (`****2509`) - Chequing ($753.73)
2. **CIBC eAdvantage Savings** (`****3102`) - High-Interest Savings (-$4.81)
3. **TD Every Day Chequing** (`****4491`) - Chequing ($753.73)
4. **TD High Interest Savings** (`****8830`) - Savings ($0.00)
5. **RBC Day to Day Banking** (`****1209`) - Chequing ($0.09)
6. **RBC High Interest eSavings** (`****5521`) - Savings ($0.00)
7. **RBC NOMI Find & Save** (`****9941`) - Automated Savings ($0.00)

### **Credit Cards & Limits**
8. **TD Low Rate Visa** (`****1142`) - **$1,000 Limit** ($709.86 balance)
9. **CIBC Dividend Visa** (`****9012`) - **$3,500 Limit** ($37.88 balance)
10. **Rogers Red Mastercard** (`****6633`) - **$500 Limit** ($75.71 balance)
11. **American Express Green Card** (`****3001`) - **$8,500 Limit** ($989.06 balance)
12. **American Express Essential Card** (`****4002`) - **$13,500 Limit** ($10,145.23 balance)
13. **American Express SimplyCash Card** (`****5003`) - **$1,100 Limit** ($369.88 balance)

**Total Seed Data:** Exactly **4,158 posted transactions** (+ 3 pending holds) reconciled from:
- `data/master_bank_accounts.csv` (1,771 rows)
- `data/master_credit_cards.csv` (2,387 rows)

---

## 🚀 Monorepo Architecture

```text
/
├── apps/
│   ├── web/            # Next.js 15 App Router + Tailwind CSS + shadcn/ui + Recharts
│   └── mobile/         # Expo 52 (React Native) + Expo Router + Notifications
├── packages/
│   ├── shared/         # Zod schemas, TypeScript contracts, CAD formatters, balance math
│   └── db/             # Prisma ORM, seed pipeline, and dual Postgres/Local cache adapter
├── data/
│   ├── master_bank_accounts.csv  # 1,771 real bank transactions
│   ├── master_credit_cards.csv   # 2,387 real credit card transactions
│   └── seed_cache.json           # Offline / dev high-speed cache
└── supabase/
    ├── config.toml               # Supabase project configuration
    ├── migrations/               # PostgreSQL DDL, pgvector extension, RLS policies
    └── functions/check-bills-due # Daily 9:00 AM Cron Edge Function for bill reminders
```

---

## ⚡ Free Forever Tech Stack

| Layer | Technology | Free Tier Specifications |
|---|---|---|
| **Monorepo** | Turborepo + pnpm | Blazing fast parallel build orchestration |
| **Web** | Next.js 15 App Router + React 19 | Hosted on Vercel Hobby / Self-hosted (Free Forever) |
| **Mobile** | Expo (React Native) + Expo Router | iOS + Android single codebase, Expo Go & EAS free tier |
| **Database** | Supabase Postgres | 500 MB DB, 1 GB Storage, 50k MAU, pgvector enabled (Our 4,158 txs = ~3 MB) |
| **Alternative DB** | PocketBase | 100% free open-source single-binary self-hosted backup |
| **ORM** | Prisma 6 | Type-safe queries and schema migrations |
| **AI Copilot** | Gemini 2.0 Flash + Tool Calling | 15 RPM / 1,500 RPD free tier with autonomous CRUD |
| **State** | Zustand + TanStack Query | Client-side caching, optimistic mutations, privacy masking |
| **Charts** | Recharts | Interactive financial trajectories, donut breakdowns |
| **Vault** | pdf.js client-side parser | Zero-server PDF parsing for Equifax/TransUnion statements |

---

## 🛠️ Getting Started in Under 2 Minutes

### Prerequisites
- Node.js `v20+` or `v22+`
- `pnpm` (`v10+` or `v12+`)

```bash
# Clone and enter directory
cd d:/Habitrage

# Install workspace dependencies
pnpm install

# Approve binary dependencies in pnpm 12 (if prompted)
pnpm approve-builds --all

# Generate Prisma Client & compile shared packages
pnpm generate
pnpm --filter @financeos/shared build
pnpm --filter @financeos/db build
```

---

## 💻 Running the Web Application

To launch the Next.js 15 web application on `http://localhost:3000`:

```bash
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000) to view:
- **Dashboard (`/`)**: Net worth, cash assets vs. debt, monthly income vs. spend, category donut, accounts grid, recent transactions, and upcoming bills.
- **Accounts (`/accounts`)**: Bank & credit card cards, credit limit meters, running balance trend lines, Plaid Link simulation.
- **Transactions (`/transactions`)**: 50/page virtualized table, full CRUD modal, inline category badges, debounced search, multi-criteria filters, and CSV import/export.
- **Pending Holds (`/pending`)**: Active pending holds that do not affect your posted balance until approved.
- **Bills & Reminders (`/bills`)**: Calendar view, statement due calculator (Statement + 21 days for CIBC/TD), one-click payment execution.
- **Credit Report Vault (`/credit-reports`)**: Interactive 300–900 score gauge, utilization progress bar, inquiry logs, trade lines, and PDF drag-and-drop.
- **Analytics (`/analytics`)**: Income vs. expense bar charts, top 10 merchants, expenditure by card.
- **AI Copilot (`/assistant` & floating widget)**: Autonomous financial assistant executing tool calls on your live ledger.
- **Settings (`/settings`)**: Currency CAD, masking privacy toggle (`****2509`), and CSV export.

---

## 📱 Running the Mobile App (iOS & Android)

The mobile app shares 90% of business logic, types, and formatting with the web app:

```bash
# Start Expo development server
pnpm dev:mobile
```

### Options:
1. **Physical Device (Expo Go)**: Scan the QR code in the terminal using the Expo Go app (iOS Camera or Android Expo Go).
2. **Android Emulator**: Press `a` in the terminal to open in Android Studio emulator.
3. **iOS Simulator**: Press `i` in the terminal to launch on Xcode simulator (macOS).
4. **Cloud Build with EAS**:
   ```bash
   npx eas-cli build --platform android --profile preview
   npx eas-cli build --platform ios --profile preview
   ```

---

## 🗄️ Supabase Free Forever Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project in the **Free Tier**.
2. Copy your **Database Connection String (URI)** from `Project Settings -> Database`.

### 2. Configure Environment Variables
Create `.env` at the root or in `packages/db/.env`:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
GEMINI_API_KEY="[YOUR-FREE-GEMINI-API-KEY]"
```

### 3. Run Migrations & Push Schema
```bash
# Push schema to Supabase Postgres
pnpm --filter @financeos/db prisma db push

# Run initial SQL migration (pgvector + Storage bucket + RLS)
# In Supabase SQL Editor, paste: supabase/migrations/20261016_initial_schema.sql
```

### 4. Deploy Edge Function for Daily Bill Notifications
```bash
# Install Supabase CLI if needed: npm i -g supabase
supabase login
supabase link --project-ref [YOUR-PROJECT-REF]
supabase functions deploy check-bills-due
```

---

## 🤖 AI Assistant Capabilities (Function Calling Engine)

FinanceOS AI uses Gemini 2.0 Flash function calling to inspect and modify your financial ledger in real time:

| User Query | Executed Function Call | Action Taken |
|---|---|---|
| *"What are my account balances?"* | `getAccountBalances()` | Queries all 13 accounts and prints live balances + limits |
| *"How much did I spend at Walmart?"* | `searchTransactions({ query: 'WAL-MART' })` | Aggregates all 32 Walmart transactions ($855.51 CAD) |
| *"Add Rogers $50 due 15th monthly"* | `createBill({ name: 'Rogers', amount: 50, due_day: 15 })` | Inserts bill, schedules 9 AM reminder |
| *"When is my CIBC Visa due?"* | `getBillsDue({ query: 'CIBC' })` | Computes statement date + 21 days |
| *"Delete transaction [ID]"* | `deleteTransaction({ id })` | Deletes row and **chronologically recalculates running balance** |
| *"Show pending transactions"* | `searchTransactions({ status: 'pending' })` | Returns pending holds without affecting balance |

---

## 🧮 Running Balance Recalculation Engine

FinanceOS guarantees that whenever a transaction is **created**, **edited**, or **deleted**:
1. All transactions for that specific account are sorted chronologically by `date ASC, created_at ASC`.
2. All `pending` items are excluded from ledger balance impact.
3. Every posted row recalculates `running_balance = previous_balance + (credit - debit)`.
4. The final latest balance is saved to the account's `balance` field.

---

## 🔒 Security & Privacy Defaults
- **Privacy Masking**: One-click toggle hides balances and renders numbers as `****2509`.
- **Client-Side PDF Parsing**: Credit reports are parsed directly in the user's browser using `pdf.js` — raw credit files are never exposed to external scrapers.
- **Zero Lock-In**: Complete data export available in standard CSV format at any time from `/settings` or `/api/export`.

---

© FinanceOS — Free Forever Personal Finance Operating System. Built with Turborepo, Next.js 15, Expo, and Supabase.
