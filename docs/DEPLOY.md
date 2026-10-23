# Deploying FinanceOS

FinanceOS runs on PostgreSQL as its sole database store. It supports multi-instance serverless deployments (Vercel, Google Cloud Run) without persistent disk requirements.

## 1. Secrets & Environment Variables

Configure these in your host's secret manager or `.env.local` (never commit real values):

- `AUTH_SECRET`: 32+ random characters signing session cookies and JWT tokens.
  Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
- `FINANCEOS_PASSCODE`: 12+ character master passphrase unlocking the vault. The app throws on startup if this is shorter than 12 characters in production.
- `OWNER_ID`: Scopes all ledger queries and operations (defaults to `"owner"`).
- `DATABASE_URL`: **Pooled** connection string with SSL required. On Supabase, this connects via PgBouncer on port `6543`:
  `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require`
- `DIRECT_URL`: **Direct** connection string used exclusively for `prisma migrate deploy`:
  `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require`
- `TRUSTED_PROXY_HOPS`: `1` behind a single proxy (Cloud Run, Vercel, nginx).
- `OPENROUTER_API_KEY`: Optional key for AI assistant features.

## 2. Serverless & Prisma Architecture

- **Singleton PrismaClient**: One instance per process managed via `globalThis.prisma`. Connections are pooled; never instantiate per-request.
- **Binary Targets**: Prisma generates engines for:
  - `native` (local development)
  - `rhel-openssl-3.0.x` (Vercel serverless functions)
  - `linux-musl-openssl-3.0.x` (Alpine / Docker containers)
- **Migrations**: Deployment runs:
  ```bash
  pnpm --filter @financeos/db exec prisma migrate deploy
  ```
- `prisma generate` runs automatically on install and build.
- **Login Rate Limiting**: Managed via the PostgreSQL `RateLimit` table (`rate_limits`), persisting across restarts and shared across multiple running instances.

## 3. Database Migration & Seed

To import existing ledger JSON data into a clean Postgres database:
```bash
pnpm --filter @financeos/db import:json -- --file data/seed_cache.json
```
The import script is idempotent and performs verification comparing row counts, account balances, and cash flow totals.

## 4. Health Checks & Security

- Health check: `GET /api/health` returns `{ "ok": true }` (public, unauthenticated).
- Session cookies are strictly `httpOnly`, `SameSite=Lax`, and `Secure` over HTTPS.
- Strict-Transport-Security (HSTS) headers are enforced in production.

## 5. Mobile App

Set `EXPO_PUBLIC_API_URL` (e.g. `https://financeos.example.com/api`) when building mobile binaries. Mobile uses Bearer token authentication stored in the OS secure keychain.
