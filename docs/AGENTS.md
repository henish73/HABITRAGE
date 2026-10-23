
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
