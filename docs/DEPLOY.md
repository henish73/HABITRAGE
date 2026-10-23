# Deploying FinanceOS

FinanceOS stores its data in one JSON file (the ledger), so a few rules matter in production.

## Before the first deploy

1. **Set the secrets** (see `apps/web/.env.example`). The app refuses to run in production without them.
   - `AUTH_SECRET`: 32+ random characters. Generate one:
     `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `FINANCEOS_PASSCODE`: a long passphrase (use 12+ characters; it's the only thing protecting your ledger).
   - `TRUSTED_PROXY_HOPS`: `1` behind a single proxy (Cloud Run, Vercel, nginx).
   - Optional: `OPENROUTER_API_KEY` for the AI assistant.
2. **Never commit** `.env*` files, `data/seed_cache.json` or your statement files. They're git-ignored.
3. If an old key or passcode ever appeared in code, a chat or a screenshot, **change it** before going live.

## Run exactly one instance

The ledger lives in memory and in a single file. Two instances would each keep their own copy and overwrite one another.

- Cloud Run: `--max-instances=1 --min-instances=1` (and `--cpu-boost`).
- Docker / VM: one container.

## Keep your data

- Mount a persistent volume at `/app/data` (or set `FINANCEOS_DATA_FILE` to a path on a volume). Without one, **all data is lost whenever the container is replaced.** Cloud Run's own disk is temporary, so use a volume mount (Cloud Storage FUSE or a filestore) or run on a VM.
- Back it up: copy `seed_cache.json` somewhere safe on a schedule. The file is written atomically, so a copy is always consistent.
- Deleted transactions stay recoverable for 30 days (in the same file).

## Build and run

```bash
docker build -t financeos-web .
docker run -d --name financeos -p 8080:8080 \
  -e AUTH_SECRET=... -e FINANCEOS_PASSCODE=... \
  -v financeos-data:/app/data \
  financeos-web
```

Health check: `GET /api/health` returns `{ "ok": true }` (no login needed, no data).

## Serve over HTTPS

Session cookies are marked `Secure` in production, so the site must be served over HTTPS (Cloud Run, Vercel and most hosts do this for you). Strict-Transport-Security is sent automatically.

## Mobile app

Set `EXPO_PUBLIC_API_URL` (for example `https://financeos.example.com/api`) before building the app, so phones and real devices can reach the server. The app signs in with your passcode and keeps only a session token in the device keychain.

## Known limits

- A JSON file suits one person's ledger (thousands of rows). For several users or very large data, move to Postgres as the primary store (the schema is in `packages/db/prisma`).
- Login attempts are limited per client address and overall, in memory (they reset on restart).
