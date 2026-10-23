# Prompts for your AI coding assistant

Copy-paste prompts to take FinanceOS from where it is now to production, **web first, then mobile**.
They match `docs/production-plan-v2.html`. IDs like S1, D1, B1 refer to the anomaly register in `docs/production-plan.html`.

## How to use these

1. **Give the assistant the project brief once.** Save the "Project brief" below as `CLAUDE.md` in the repo root (or `AGENTS.md`, or your tool's rules file) so every session starts with it. Otherwise paste it at the top of each session.
2. **One phase per session and per git branch.** Paste the phase prompt, let it work, then review the diff yourself.
3. **Run the checks yourself** (`pnpm typecheck`, `pnpm test`, `pnpm --filter web build`) before you merge. Don't rely on "it works".
4. **Use a fresh session for the verifier prompt (V)** after each big phase. An assistant is a poor judge of its own work.
5. **Never paste real secrets** (passcode, `AUTH_SECRET`, database URLs, API keys) into the chat. Put them in `.env.local` or your host's secret settings.
6. If you'd rather run everything in one go, use the **master prompt**; it stops for your approval after every phase.

**Fill-in values** (replace in the prompts before sending):

| Placeholder | What to put |
|---|---|
| `<HOST>` | `VERCEL` or `CLOUD_RUN` (Vercel is the recommended choice) |
| `<DB>` | `Supabase Postgres` (recommended) or your own Postgres |
| `<DOMAIN>` | the domain you'll use, or "none yet" |
| `<REGION>` | a region near you, e.g. Canada Central |

---

## Project brief (save as CLAUDE.md, or paste first)

```text
PROJECT: FinanceOS, a personal finance app for ONE user (Canadian bank accounts and credit cards, CAD): a Next.js web app and an Expo mobile app. Data is entered manually (add transaction, CSV import). Real bank-connection platforms such as Plaid are out of scope. It must be production ready and may become multi-user later.

REPO (pnpm monorepo, Node 22, pnpm 12):
- apps/web: Next.js 15 App Router, React 19, Tailwind 3, TanStack Query, zustand. API routes: apps/web/src/app/api/**. Pages: / (Home), /activity (transactions explorer), /wallet, /plan, /analytics, /settings, /login, /report (printable). Old routes (/transactions, /accounts, /bills, /pending, /credit-reports, /assistant) redirect to the new ones.
- apps/mobile: Expo 52 / React Native with expo-router. Session token in SecureStore and an offline cache live in apps/mobile/src/lib/api.ts.
- packages/db: the data layer. packages/db/src/client.ts exports `db`. TODAY it is a JSON-file store (data/seed_cache.json, gitignored) with a partial Postgres mirror through Prisma (packages/db/prisma/schema.prisma).
- packages/shared: types, zod schemas and helpers (formatCAD, needsReview, categorizeMerchant, calculateNetWorth).
- packages/design-tokens: colours and typography; generates the CSS variables for web and the theme for mobile.
- docs/: production-plan.html (anomaly register), production-plan-v2.html (the plan), DEPLOY.md, AI_PROMPTS.md.

COMMANDS: pnpm install | pnpm dev:web | pnpm test | pnpm typecheck (builds packages, then tsc for web and mobile) | pnpm --filter web build | pnpm generate (prisma generate) | pnpm audit --prod.
Tests use node:test through tsx (packages/db/src/__tests__, packages/shared/src/__tests__, apps/web/src/lib/__tests__). There are 83 passing tests; they must stay green.

CONVENTIONS THAT MUST NOT BREAK:
- Amounts are signed: negative = money out, positive = money in.
- A credit card's `balance` is the amount OWED (positive = debt); a charge (negative amount) increases it. Bank balance = opening_balance + sum(posted amounts). Card balance = opening_balance - sum(posted amounts). Pending rows never affect balances.
- Transaction `type` is Inflow | Outflow | Transfers. Transfers are left out of spending and income summaries.
- Transaction filters are defined ONCE in apps/web/src/lib/tx-filters.ts and used by the list API, CSV export, bulk actions and the report. Never duplicate that logic.
- API errors go through apps/web/src/lib/api-error.ts (apiError). Never return a raw error.message on a 500.
- Auth: one passcode becomes a signed session token (apps/web/src/lib/auth.ts), sent as an httpOnly cookie (web) or a Bearer token (mobile). apps/web/src/middleware.ts guards routes.
- UI uses the Vault design tokens as CSS variables (var(--ink), var(--teal), var(--surface) ...) in light and dark, mono type for money, and the `blurnum` class when the privacy mask is on. Reuse existing components and styles.

DECISIONS ALREADY MADE BY THE OWNER:
- Hosting: <HOST> (serverless: no persistent disk, several instances, memory is lost on restart) with <DB>. Region: <REGION>. Domain: <DOMAIN>.
- One user now; design for several later (owner_id on every table).
- Web first, then mobile.
- No bank-connection integrations. All data is manual.
- The owner enters pay and income manually in Settings.

RULES FOR YOU:
1. Work on a git branch per phase. Make small commits with clear messages. Never commit secrets, .env* files, data/, or real bank statements (datasets_financial_mesh/, any real csv/xlsx/pdf).
2. Never print, log or hard-code a secret or the passcode. Use environment variables. If you need a value only the owner has, stop and ask.
3. Do not invent data. No hard-coded sample numbers, counts, dates or names in UI or logic; use empty states.
4. Never run destructive actions on real data. Use test databases and fixtures. Take a copy before any migration.
5. Before you say "done": run pnpm typecheck, pnpm test and pnpm --filter web build (plus pnpm audit --prod if dependencies changed) and paste the real results. If anything failed or was not verified, say so plainly.
6. For UI changes, check them in a running app in a browser: light, dark and phone width. Look at the browser console for errors.
7. Ask before: adding a dependency not named in the task, upgrading anything beyond what the task names, changing the data model beyond the task, or anything irreversible.
8. Stay inside the phase. Write down other problems you notice instead of fixing them silently.
9. Finish with: what changed, files touched, tests added, evidence of verification, anything skipped or risky, and what you recommend next.
```

---

## Master prompt (all web phases, with approval gates)

```text
Read CLAUDE.md (project brief), docs/production-plan-v2.html, docs/production-plan.html (anomaly register) and docs/AI_PROMPTS.md.
Carry out phases P0, P1, P2, P3 and P4 (the web launch) in order, using the task list for each phase in docs/AI_PROMPTS.md. Use one git branch per phase (prod/p0-security, prod/p1-postgres, prod/p2-data, prod/p3-manual, prod/p4-deploy).
After each phase STOP and send me the report described in rule 9, with real command output as evidence. Do not start the next phase until I reply "continue". If a check fails, fix it before reporting, or tell me clearly that it is still failing.
Start with P0.
```

---

## P0: Security blockers (about 1 day)

```text
PHASE 0: SECURITY BLOCKERS. Branch: prod/p0-security.

CONTEXT
Next.js 15.1.7 has a middleware authorization bypass. I confirmed locally that a request with the header
  x-middleware-subrequest: src/middleware:src/middleware:src/middleware:src/middleware:src/middleware
and NO login returned all accounts from /api/accounts and opened pages. The login is checked only in apps/web/src/middleware.ts. `pnpm audit --prod` also reports critical and high advisories, mostly in next (including remote code execution). The packages `ai` and `@google/genai` in apps/web/package.json are not imported anywhere.

TASKS
1. Upgrade `next` in apps/web to the latest 15.5.x (15.5.16 or newer). Keep React 19. Do NOT move to Next 16. Fix any build or type errors the upgrade causes.
2. Create apps/web/src/lib/require-auth.ts exporting `requireAuth(req: Request)`. It accepts a valid session cookie (financeos_session) OR `Authorization: Bearer <session token>`, checked with verifySessionToken. It returns null when the caller is signed in, otherwise a 401 JSON NextResponse (same body style as the middleware). Call it as the FIRST line of EVERY handler (GET, POST, PUT, DELETE) in apps/web/src/app/api/** except: api/auth/login, api/auth/logout, api/health. api/auth/me keeps its own check.
3. Add apps/web/src/lib/__tests__/route-auth.test.ts that scans every route.ts under src/app/api and FAILS if any exported handler does not call requireAuth (allow-list only the three routes above). Future routes must not be able to forget it.
4. Check whether any server component or page reads ledger data without going through an authenticated API call. List anything you find and fix it.
5. Remove the unused dependencies `ai` and `@google/genai` from apps/web/package.json, and the `@google/genai` entry from pnpm-workspace.yaml. Prove nothing imports them (grep) and that the build still passes.
6. Production guard: in apps/web/src/lib/auth.ts make getMasterPasscode() throw in production when the passcode is shorter than 12 characters (AUTH_SECRET must already be 32+). Dev defaults stay for NODE_ENV !== production only. Update apps/web/.env.example and docs/DEPLOY.md.
7. Run `pnpm audit --prod`. Fix everything fixable in apps/web's dependencies. In your report list the remaining advisories by package and say for each whether it ships to production or is a mobile build tool only.

VERIFY (paste real output)
- pnpm typecheck, pnpm test, pnpm --filter web build.
- Start the production build locally (with test secrets in .env.local, never printed) and run:
    curl -i localhost:3000/api/accounts                                  -> 401
    the same request with the x-middleware-subrequest header above        -> MUST be 401
    the same header against /api/transactions, /api/export and /wallet    -> 401, or a redirect to /login (never 200 with content)
    log in with the correct passcode, then GET /api/accounts              -> 200
- Run the new route-auth test and show it failing when you temporarily remove requireAuth from one route (then restore it).

DONE WHEN: every bypass request fails, the test guards every route, no critical advisories remain in the web production dependencies, and all checks are green.
DO NOT print or set the real passcode. I will choose a new passcode myself and put it in the host's secret settings.
```

---

## P1: Move everything to Postgres (4 to 6 days)

```text
PHASE 1: MOVE EVERYTHING TO POSTGRES. Branch: prod/p1-postgres.

WHY
I will deploy to <HOST>: no persistent disk, several instances can run at once, memory is wiped on restart. Today `db` in packages/db/src/client.ts keeps everything in memory and rewrites data/seed_cache.json; only transactions and categories are partly mirrored to Postgres, and accounts, bills, credit reports, opening balances and the trash never are. That cannot run in production. Postgres must become the ONLY store. For future multi-user use, add owner_id now.

TASKS
1. SCHEMA (packages/db/prisma/schema.prisma). Add what the app already uses but the database lacks:
   - Account: opening_balance Decimal(14,2) default 0, apr Decimal(7,6)?, due_date String?, minimum_payment Decimal?, statement_closing_date String?, notes String?, archived Boolean default false, owner_id String.
   - Transaction: reviewed_at DateTime?, exclude_from_reports Boolean default false, deleted_at DateTime? (soft delete = the 30-day trash), import_batch_id String?, owner_id String.
   - Bill, CreditReport, AiChatHistory, Category: owner_id. Category unique on (owner_id, name).
   - New model IncomeSource: id, owner_id, name, amount Decimal, frequency (weekly | biweekly | semimonthly | monthly), next_date String, account_id String?, active Boolean.
   - New model RateLimit: key String @id, count Int, reset_at DateTime (for login throttling).
   - Indexes: (owner_id, account_id, date), (owner_id, date), (owner_id, status), (owner_id, deleted_at).
   - owner_id comes from env OWNER_ID (default "owner") in ONE place; every query filters by it.
   Money is Decimal(14,2) in the database and converted to a plain number at the db boundary, so API and shared types do not change.
2. MIGRATIONS: use `prisma migrate dev` and commit packages/db/prisma/migrations. Deployment uses `prisma migrate deploy`. Do not use `db push`.
3. REWRITE `db` (packages/db/src/client.ts) on Prisma with the SAME public method names, parameters and return shapes: getAccounts, getAccountById, createAccount, updateAccount, deleteAccount, getTransactions, getTransactionById, createTransaction, updateTransaction, deleteTransaction, bulkUpdateTransactions, bulkDeleteTransactions, recalculateAccountBalances, getTrash, restoreTransactions, getBills, createBill, updateBill, deleteBill, markBillPaid, getCreditReports, createCreditReport, getAiChatHistory, addAiChatMessage, clearAiChatHistory, getCategories, createCategory, deleteCategory, getCategoryUsageCount.
   Keep the exact behaviour of getTransactions: search (including the `cat:` and `type:` prefixes), banks, account_ids, categories (a transaction can hold several, comma-separated), type/types, status, source_file, needs_review (shared needsReview rule: pending OR empty/general/uncategorized/misc category OR positive amount that is not income/transfer OR description containing refund/cash back), date range (inclusive), amount range (by absolute value), all the sort fields, paging, and totals (totalInflow, totalOutflow, netCashFlow, accountSummary) computed with SQL aggregates over the WHOLE filtered set, not just the page.
   Use database transactions for every multi-row write. deleteTransaction/bulkDeleteTransactions set deleted_at (soft delete); every read excludes deleted rows; getTrash and restoreTransactions use it; add purgeTrash(olderThanDays = 30).
   After any write that changes posted amounts, recompute account.balance and per-row running_balance inside the same database transaction using the balance rules in CLAUDE.md. A new account's starting balance is stored as opening_balance.
4. REMOVE: the JSON store (getCachePath, loadMemoryStore, saveMemoryStore, FINANCEOS_DATA_FILE), the old partial Postgres mirror code, and the in-memory trash. Keep a seed script for development only that writes to the database and never runs automatically.
5. DATA IMPORT: packages/db/src/import-from-json.ts, run as `pnpm --filter @financeos/db import:json -- --file data/seed_cache.json [--dry-run]`. It must be idempotent (upsert by id), carry over opening_balance and the trash, and print a report: row counts per table, each account's balance recomputed from the database versus the source file, total inflow and outflow versus the source. Any mismatch means a non-zero exit. It must never modify or delete the JSON file.
6. LOGIN THROTTLE: replace the in-memory Map in apps/web/src/app/api/auth/login/route.ts with the RateLimit table (same limits: 5 failures per minute per client key, 30 per minute overall).
7. SERVERLESS SETTINGS: one PrismaClient per process (globalThis), never one per request. DATABASE_URL is the pooled connection (on Supabase: port 6543 with ?pgbouncer=true&connection_limit=1); DIRECT_URL is the direct connection used only for migrations. binaryTargets: "native", "rhel-openssl-3.0.x" (Vercel) and "linux-musl-openssl-3.0.x" (Docker/Alpine). prisma generate runs on install and build. SSL required. Document all of it in apps/web/.env.example and docs/DEPLOY.md.
8. TEST DATABASE: add docker-compose.yml with postgres:16 on port 5433, plus scripts `test:db:up` and `test:db:down`. Tests use TEST_DATABASE_URL, apply migrations to a fresh schema and clean tables between tests. The 29 existing data-layer tests in packages/db/src/__tests__/client.test.ts are the specification: keep them passing (only adapt setup). Add tests for: soft delete and restore, two clients writing at the same time, and owner scoping (a row with another owner_id is never returned or changed).
9. SQL PAGING: /api/transactions and /api/export must page and aggregate in SQL. Never load all rows into memory and slice.

VERIFY (paste real output)
- docker compose up -d, then pnpm test: all green (83 or more).
- Import my real file into a FRESH local database: the report must show 4,159 transactions, 13 accounts, every account balance identical, and identical inflow/outflow totals.
- Run two web servers at once (ports 3000 and 3001) against the same database. Add a transaction on one and see it on the other. Delete then undo on one and see it on the other.
- pnpm typecheck and pnpm --filter web build.
- In a browser, with the migrated data, check Home, Activity (filters, bulk change, CSV export, report), Wallet and Plan. Compare the headline numbers to before (net worth is currently about -$12,978). If anything differs, explain exactly why.

DONE WHEN: no code path reads or writes the JSON file or process memory for data; all tests pass on Postgres; the import report shows exact parity; two running instances agree.
DO NOT delete data/seed_cache.json, run anything against my production database, or change any API response shape.
```

---

## P2: Make the numbers trustworthy (3 to 4 days)

```text
PHASE 2: MAKE THE NUMBERS TRUSTWORTHY. Branch: prod/p2-data.

EVIDENCE from a scan of my real ledger (4,159 rows):
- 651 rows have type Transfers but only 404 pair up (same day, opposite amount, different account); 247 are unpaired; all transfers together net to +$26,996 (internal moves should net to about 0). The "Transfers" type mixes internal moves, card payments (106 rows categorised "Credit Card Payments"), e-transfers to or from other people, and tuition.
- 20 rows where type contradicts the sign (e.g. Uber on 2026-10-13: Inflow -5.64 and Outflow +5.64; Amazon refunds of +68.13 and +37.32 typed Outflow).
- 25 possible duplicate groups / 40 extra rows (largest: eight identical "PAYPAL -100" debits and eight "+100 reversal" credits on 2026-07-07 in CIBC eAdvantage Savings).
- 86 rows categorised "Adjustments not to consider" that totals and charts still count (only budgets skip them).
- 654 rows (16%) match the review queue rule and there is no way to mark one reviewed.
- 318 "Miscellaneous" rows; the category typo "Tution Payments" (22 rows); 2 zero-amount rows.
- CIBC eAdvantage Savings: its rows add up to +$116.40 but the account balance is $0, so the app invented an opening balance of -$116.40.
- "Sort by amount" sorts the signed value, so refunds come first when sorting largest first.

TASKS
1. TRANSFERS. Add transfer_kind (internal | external_in | external_out) and transfer_group_id to transactions. Pairing rule: opposite amounts, different accounts of the same owner, dates within 2 days; a card payment pairs with the credit on the card account. Internal transfers are EXCLUDED from every income, spending, chart, budget, forecast and AI summary. Unpaired transfers become external: money in counts as income, money out counts as spending, after the owner confirms in review. Run pairing automatically on create, import and edit, and provide a "re-pair all" action.
2. DATA-HEALTH SCREEN (new page /settings/data-health, linked from Settings and from the Activity page). It lists, with counts and a sample: type vs sign mismatches, possible duplicates (same account, date, amount, description), zero amounts, unpaired transfers, unreviewed items, stale accounts (no activity for 60+ days), and accounts whose derived opening balance is not 0. Each has a fix button with a PREVIEW of what will change and an undo (use the existing 30-day trash and a batch id). Never change data without the owner pressing the button.
3. EXCLUDE FLAG. Honour transactions.exclude_from_reports in every total, chart, budget, forecast, export summary and AI summary. Migrate the "Adjustments not to consider" category into the flag (preview first), and add the flag to the transaction drawer and as a bulk action.
4. REVIEWED FLAG. Use reviewed_at. The review queue shows only unreviewed rows that match the rule. Add a bulk "Mark reviewed" action and a "Reviewed" toggle in the drawer. Tighten the rule so that a normal categorised refund is not flagged forever.
5. SORT. "Amount" sorts by absolute size, and show two clear options: "Largest first" and "Smallest first". Keep the signed amount in the display.
6. CATEGORIES. Add a merge tool (move all rows from category A to B) and fix "Tution Payments" -> "Tuition Payments" through it. Keep Settings > Categories working.
7. CARDS. Show an "Estimated" badge wherever an APR or due date is estimated and a "Complete your cards" checklist on Wallet linking to the edit dialog.
8. TESTS for: pairing (including ties, 2-day window, three-account chains), exclusion in totals, review queue behaviour, sort, merge, and the health detectors. Use small fixtures, never my real data.

VERIFY (paste real output)
- pnpm typecheck, pnpm test, pnpm --filter web build.
- With a COPY of my migrated data: run the detectors and report the numbers (before and after applying the fixes): unpaired transfers, net of internal transfers (target about 0), type-sign mismatches (target 0), duplicate groups (listed for me to decide), review queue size (target under 50).
- Pick one full month and show totals before and after, and check them against the owner's statement figures that I provide.
- In the browser: data-health screen, preview and undo of a fix, bulk Mark reviewed, bulk exclude, sort options.

DONE WHEN: internal transfers net to about zero and are excluded from totals; the review queue is clearable to zero; month totals match my statements; every fix is previewable and undoable.
DO NOT delete rows. Anything that looks like a duplicate is only listed, never removed automatically.
```

---

## P3: Manual-first product (3 days)

```text
PHASE 3: MANUAL-FIRST PRODUCT. Branch: prod/p3-manual.

CONTEXT
I will never connect banks through Plaid or similar. All data is entered or imported by me. I enter my pay myself. Right now: the "Connect Bank" button opens a simulated Plaid screen (apps/web/src/components/accounts/PlaidSimulationModal.tsx, store fields isPlaidModalOpen/openPlaidModal, a button in apps/web/src/app/wallet/page.tsx, mounted in AppShell); /api/forecast hard-codes a $751.30 payday every 14 days from 2026-10-16 and $36.50 of daily spending; "4,159 transactions" is typed into the Analytics subtitle, the AI system prompt and the AI fallback reply; Settings shows bill reminders as "Active" although nothing runs, and has a Supabase setup guide; the mobile More screen says "Synced with Supabase ... 4,158 transactions"; old-route redirects drop the query string; globals.css loads Google Fonts at runtime.

TASKS
1. REMOVE the fake bank connection completely: the modal, its store fields, both "Connect Bank" buttons, and any text implying a bank link. Replace the Wallet button with "Import statement (CSV)" and "Add transaction".
2. INCOME SETTINGS. New Settings section "Income" (uses the IncomeSource table): name, amount, frequency (weekly, every two weeks, twice a month, monthly), next pay date, deposit account, active toggle. Also "Expected one-off income/bills" (date, amount, label). Validate everything (zod in packages/shared), handle month-end dates (a pay day of the 31st), and show the next 6 pay dates as a preview.
3. FORECAST. Rewrite /api/forecast so it reads income sources, bills and one-offs from the database, and estimates daily spending as the average of the last 90 days of real spending (excluding internal transfers and excluded rows), with an optional manual override in Settings. The client sends its own date and timezone (or an explicit start date); never use the server's clock for "today". If there is no income configured, say so on Home instead of showing a made-up line.
4. CSV IMPORT. Improve apps/web/src/app/api/import/route.ts and the import dialog:
   - bank presets for CIBC, TD, RBC, American Express and Rogers files (column layouts differ: some have separate debit/credit columns, some a signed amount; card statements invert the sign), chosen automatically from the header row when possible, with a manual column-mapping step and a preview of the first 20 rows;
   - dates in YYYY-MM-DD, MM/DD/YYYY and DD/MM/YYYY handled safely (ask when ambiguous);
   - skip duplicates by account + date + amount + description (and report how many);
   - every import gets an import_batch_id; add "Undo this import" (soft delete the whole batch);
   - a dry-run summary before anything is saved: rows found, new rows, duplicates, rows with problems.
   Use small invented fixtures for tests, never my real statements.
5. REMOVE hard-coded claims: compute transaction counts from the data (Analytics, AI prompt, AI fallback); delete the false "Active" reminders text and the Supabase setup guide from Settings; fix the mobile More text. Keep the redirects but forward the query string (/transactions?search=x -> /activity?search=x, /pending -> /activity?tab=pending, etc.).
6. FONTS. Self-host Geist and Geist Mono with next/font/local (or the `geist` package, after asking me) and delete the Google Fonts @import and preconnect.
7. SEED SCRIPT. Make it opt-in (never runs on install or deploy) and remove personal sample data (bills, credit report, the "Hello Henish" chat message).
8. Add or update tests: income schedule dates (including the 31st and leap years), forecast with and without income, import presets and dedupe, redirects keep queries.

VERIFY (paste real output)
- pnpm typecheck, pnpm test, pnpm --filter web build.
- grep the source (apps/web/src, apps/mobile) for: "Plaid", "simulat", "Connect Bank", "4,159", "4,158", "751.30", "36.50", "Supabase". Anything that remains must not reach users; explain each hit.
- In the browser: change my pay amount or next pay date in Settings and show the Home forecast change; import a fixture CSV for each preset, see duplicates skipped, then undo the batch.
- Check fonts load with no request to fonts.googleapis.com (Network tab).

DONE WHEN: no fake bank feature or hard-coded number reaches a user; changing pay in Settings changes the forecast; imports are previewed, de-duplicated and undoable.
```

---

## P4: Deploy, protect and watch (3 days)

```text
PHASE 4: DEPLOY, PROTECT AND WATCH. Branch: prod/p4-deploy. Target host: <HOST> (VERCEL or CLOUD_RUN). Database: <DB>. Domain: <DOMAIN>. Region: <REGION>.

TASKS
1. ENVIRONMENTS. Document and script a staging and a production environment, each with its OWN database and its own secrets (AUTH_SECRET, FINANCEOS_PASSCODE, DATABASE_URL pooled, DIRECT_URL direct, OWNER_ID, OPENROUTER_API_KEY if used, TRUSTED_PROXY_HOPS=1, CRON_SECRET). Never share data or secrets between them. List every variable in apps/web/.env.example with a comment.
2. DEPLOYMENT.
   - If VERCEL: project root apps/web with "include source files outside the root directory" on; install command `cd ../.. && pnpm install --frozen-lockfile`; build command `cd ../.. && pnpm build:packages && pnpm --filter @financeos/db generate && pnpm --filter web build`; make next.config.ts use `output: "standalone"` only when NOT on Vercel; add vercel.json with the region and the cron entries below.
   - If CLOUD_RUN: use the existing Dockerfile; give the exact gcloud commands (build, deploy, region northamerica-northeast2 or as chosen, secrets from Secret Manager, min-instances 0 or 1, more than one instance is allowed now), and a health check on /api/health. Cloud Scheduler replaces Vercel cron.
   - Database migrations run in CI with `prisma migrate deploy` using DIRECT_URL on merge to main (never inside the web build).
   - Secure cookies on, HTTPS only, domain connected, security headers verified (curl -I).
3. CI (GitHub Actions) on every pull request and push: pnpm install --frozen-lockfile, typecheck, tests against a postgres:16 service container, web build, `pnpm audit --prod` (fail on critical or high in apps/web), and Playwright smoke tests. Cache pnpm. Pin Node 22.
4. PLAYWRIGHT SMOKE TESTS (against a built app and a test database seeded with invented data): wrong passcode is rejected and throttled after repeated tries; login; Home shows numbers; Activity date range changes totals; filter by type; CSV export downloads with the filtered row count; /report opens with the same totals; bulk change of type with confirmation; delete then undo; unauthenticated /api/accounts is 401; the x-middleware-subrequest header does not bypass login.
5. BACKUPS. Daily database backups kept 30 days. If the plan has no built-in backups, add a scheduled `pg_dump` job (GitHub Action or Cloud Scheduler) that writes an ENCRYPTED file to private storage. Write docs/RUNBOOK.md with a restore procedure and perform one restore rehearsal into an empty database, comparing row counts and account balances.
6. MONITORING. Add Sentry (web and later mobile) with sendDefaultPii off and a beforeSend that strips request bodies, URLs' query strings and any money values. Add an uptime check on /api/health and a second endpoint /api/ready that runs `SELECT 1` (no data returned). Alert on: 5xx spikes, repeated 429s on /api/auth/login, failed cron jobs. Log without secrets or transaction details.
7. CRON ENDPOINTS (all protected by `Authorization: Bearer $CRON_SECRET`, excluded from the login middleware but rejected without the secret): /api/cron/purge-trash (daily, calls purgeTrash(30)). OPTIONAL if I say yes: /api/cron/bill-reminders sending an email (Resend) for bills due in the next 3 days.
8. docs/RUNBOOK.md: how to deploy, roll back, restore a backup, rotate the passcode and AUTH_SECRET (and what that logs out), add a user later, and read the monitoring alerts.

VERIFY (paste real output)
- CI is green on a pull request, including the Playwright tests.
- A staging deployment URL works end to end; production is promoted by hand.
- curl -I against staging shows: Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Content-Security-Policy, Referrer-Policy; cookies are Secure and HttpOnly.
- The bypass header test returns 401 on staging.
- A deliberate test error appears in Sentry with no financial data in it.
- The restore rehearsal matched row counts and balances.

DONE WHEN: a push to main deploys to staging automatically, production is promoted by hand, a restored backup opens correctly, and monitoring catches a deliberate fault.
DO NOT put real secrets in the repo, CI logs or chat. Tell me which secrets I must create and where to paste them.
```

---

## P5: Mobile app (5 to 7 days, after web is live)

```text
PHASE 5: MOBILE APP. Branch: prod/p5-mobile. The web API is live at <DOMAIN> (staging and production).

CONTEXT
apps/mobile (Expo 52) now signs in with the passcode, keeps a session token in SecureStore, caches data for offline use and shows an offline banner, but: app.json points to ./assets/icon.png and there is no assets folder; there is no eas.json; EXPO_PUBLIC_API_URL is not set for real devices; the app has never run on a device; there is no biometric lock; notification permission is requested but nothing sends notifications; Transactions has no date range, filters, export or add-transaction.

TASKS
1. BUILD SETUP: create the icon, adaptive icon, splash and favicon in apps/mobile/assets (simple Vault-themed artwork is fine; tell me where to swap in a final logo); app.json with name, slug, version, bundle identifier and Android package, userInterfaceStyle automatic, and `extra.apiUrl` per profile; eas.json with development, preview (internal distribution) and production profiles, each with its own EXPO_PUBLIC_API_URL (staging or production). Give the exact eas commands.
2. SESSION: sign in against the live API; on a 401 return to the login screen; sign-out clears the token and caches (already coded: verify it). Shorten mobile tokens to 7 days with renewal if the web side supports it.
3. BIOMETRIC LOCK with expo-local-authentication: lock when the app opens and after 1 minute in the background (setting: 1, 5, 15 minutes), fall back to the device passcode, blur app content in the app switcher. A "Lock now" button in More.
4. PARITY WITH WEB: Transactions gets a date range (presets and custom), type/status/category filters in a bottom sheet, search across ALL transactions (server-side, paged), totals for money in, money out and net, add transaction, edit and delete with undo; Bills can mark paid (already coded: verify); Home shows the same numbers as web, including the forecast and the Needs You items.
5. NOTIFICATIONS: remove the permission request unless bill reminders are implemented in P4; if they are, register the Expo push token with an authenticated endpoint and send from the cron job.
6. QUALITY: pull to refresh, loading and error states, empty states with a next step, dynamic type and contrast, privacy mask on by default, no hard-coded data anywhere.
7. TESTS (jest-expo): session sign-in/sign-out, 401 handling, cache fallback and the offline banner source, date-range query building.
8. DISTRIBUTION: an EAS preview build for Android (APK) and iOS (TestFlight), instructions to install, and a privacy statement text for the stores that says what data is stored and where.

VERIFY (paste real output and describe what you saw)
- pnpm typecheck and the mobile tests.
- Run on an Android emulator AND on a real phone against staging: sign in, wrong passcode error, see live data, turn on airplane mode and see the offline banner with the last-synced time, add and delete a transaction, mark a bill paid, background the app for over a minute and see the lock screen, sign out.
- Compare Home numbers on the phone and on web for the same account: they must match.

DONE WHEN: a preview build installs on my phone, shows live data, locks with biometrics, works offline with the banner, and matches the web numbers.
```

---

## P6: Ready for more users (later, only when you need it)

```text
PHASE 6: READY FOR MORE USERS. Branch: prod/p6-multiuser. Do this only when I ask.

TASKS
1. AUTH: replace the single shared passcode with real accounts (Supabase Auth or Auth.js, ask me which). Invite-only sign-up (no public registration). Keep the existing session/cookie/bearer structure working for web and mobile.
2. OWNERSHIP: owner_id is already on every table. Replace the single OWNER_ID constant with the signed-in user's id. Create a scoped data layer (for example `db.forUser(userId)`) so it is impossible to query without an owner, and make the ownership filter part of every query. Add Postgres row-level security as a second lock.
3. SESSIONS: server-side sessions that can be revoked, "sign out everywhere", shorter lifetimes, rotation on login.
4. SECOND FACTOR: passkeys or one-time codes.
5. LIMITS AND SAFETY: per-user rate limits (login, chat, export, import), an audit log of sensitive actions (login, export, bulk delete, restore, setting changes), "export all my data" and "delete my account and data".
6. SCALE: add the database indexes that load tests call for; load-test the main screens with 50,000 transactions for a user.
7. TESTS: a second test user must not be able to read, change, delete or restore the first user's data through ANY route, including by guessing ids; test every API route for this with an automatic route scan like the P0 test.

DONE WHEN: user B cannot see or change user A's data by any route, the route scan proves every route is user-scoped, and a revoked session stops working immediately.
```

---

## V: Independent verifier (use in a fresh session after each phase)

```text
You are an independent reviewer. Do NOT change code unless I ask. Your job is to try to break what was just built and report the truth. Read CLAUDE.md and the phase's task list in docs/AI_PROMPTS.md first.

1. Run: pnpm install --frozen-lockfile, pnpm typecheck, pnpm test, pnpm --filter web build, pnpm audit --prod. Report exact counts and any failure.
2. Check every item in the phase's "DONE WHEN" and "VERIFY" lists yourself. Do not trust the previous report. For each: PASS or FAIL with the command or screen that proves it.
3. Attack it. At minimum:
   - Call every API route without logging in (list them by scanning apps/web/src/app/api), with a wrong passcode, with the header x-middleware-subrequest: src/middleware:src/middleware:src/middleware:src/middleware:src/middleware, and with a tampered or expired token. Only the allow-listed routes may answer.
   - Open redirect: /login?next=https://example.com and //example.com must stay inside the app.
   - CSV export: a description starting with = + - @ must be neutralised; totals in the file must equal the totals on screen for the same filters.
   - Dates: filters around month ends, leap day, reversed ranges, and the hour before and after midnight in my timezone.
   - Money: add, edit, move, delete and restore transactions on a bank account and a credit card; balances must follow the rules in CLAUDE.md after each step.
   - Bulk actions: "select all matching" with a changed ledger in between must be refused (stale count).
   - Two running copies of the app against one database must agree after writes.
   - Search the source and the built output for hard-coded secrets, my passcode, "Plaid", "simulat", sample names or numbers, and console.log of data.
   - Check the browser console for errors on every page in light, dark and phone width.
4. Report as a table: item, PASS/FAIL/NOT TESTED, evidence. Then list every defect you found with severity, steps to reproduce and a suggested fix. Say clearly what you could not test and why.
```
