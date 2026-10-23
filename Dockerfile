# FinanceOS web app: production image (Next.js standalone).
#
# Required at runtime (see apps/web/.env.example):
#   AUTH_SECRET          32+ random characters; signs session cookies
#   FINANCEOS_PASSCODE   the vault passcode
# Optional:
#   OPENROUTER_API_KEY, OPENROUTER_MODEL, DATABASE_URL, DIRECT_URL, TRUSTED_PROXY_HOPS
#
# The JSON ledger lives at /app/data/seed_cache.json. Mount a persistent volume
# at /app/data, or the data is lost whenever the container is replaced.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl && npm install -g pnpm@12.14.0
WORKDIR /app

# 1. Install dependencies for the web app and the packages it uses
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json .npmrc ./
COPY packages/db/package.json ./packages/db/
COPY packages/db/prisma ./packages/db/prisma
COPY packages/shared/package.json ./packages/shared/
COPY packages/design-tokens/package.json ./packages/design-tokens/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
RUN pnpm install --frozen-lockfile --filter "web..."

# 2. Build packages, generate the Prisma client, build Next.js
FROM base AS builder
COPY --from=deps /app ./
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm --filter @financeos/design-tokens build \
 && pnpm --filter @financeos/shared build \
 && pnpm --filter @financeos/db generate \
 && pnpm --filter @financeos/db build \
 && pnpm --filter web build

# 3. Minimal runtime
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0 \
    FINANCEOS_DATA_FILE=/app/data/seed_cache.json

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs \
 && mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
VOLUME ["/app/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

CMD ["node", "apps/web/server.js"]
