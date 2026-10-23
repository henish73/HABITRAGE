import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { requireAuth } from '../require-auth';
import { createSessionToken, SESSION_COOKIE_NAME } from '../auth';

// Only these three public routes are permitted to bypass requireAuth
const ALLOWLISTED_ROUTES = new Set([
  'api/auth/login',
  'api/auth/logout',
  'api/health',
]);

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

function findRouteFiles(dir: string, baseDir: string = dir): { absPath: string; relPath: string; routePath: string }[] {
  const results: { absPath: string; relPath: string; routePath: string }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name === 'route.ts') {
      const rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      // e.g. "accounts/route.ts" -> "api/accounts", "route.ts" -> "api"
      const dirOfFile = path.dirname(rel);
      const routePath = dirOfFile === '.' ? 'api' : `api/${dirOfFile}`;
      results.push({ absPath: fullPath, relPath: rel, routePath });
    }
  }

  return results;
}

test('every API route handler calls requireAuth (except allowlisted routes)', () => {
  const apiDir = path.resolve(__dirname, '../../app/api');
  assert.ok(fs.existsSync(apiDir), `API directory should exist at ${apiDir}`);

  const routeFiles = findRouteFiles(apiDir);
  assert.ok(routeFiles.length >= 10, `Found ${routeFiles.length} route files; expected at least 10`);

  const missingAuth: { file: string; method: string }[] = [];

  for (const { absPath, routePath } of routeFiles) {
    if (ALLOWLISTED_ROUTES.has(routePath)) {
      continue;
    }

    const content = fs.readFileSync(absPath, 'utf8');

    // Find all exported HTTP handlers
    for (const method of HTTP_METHODS) {
      // Matches: export async function GET, export function GET, export const GET =
      const handlerPattern = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b|export\\s+const\\s+${method}\\s*=`, 'g');
      const match = handlerPattern.exec(content);
      if (!match) continue;

      // Extract the code block of the handler to ensure requireAuth is called inside it
      const handlerStart = match.index;
      // Search the handler's implementation for requireAuth (ignoring comments)
      const chunk = content.slice(handlerStart, handlerStart + 600);
      const strippedChunk = chunk.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      const callsRequireAuth = /requireAuth\s*\(/.test(strippedChunk);

      if (!callsRequireAuth) {
        missingAuth.push({ file: routePath, method });
      }
    }
  }

  assert.deepEqual(
    missingAuth,
    [],
    `The following API route handlers do not call requireAuth: ${JSON.stringify(missingAuth, null, 2)}`
  );
});

test('allowlist only contains exactly the 3 permitted public routes', () => {
  assert.deepEqual(
    Array.from(ALLOWLISTED_ROUTES).sort(),
    ['api/auth/login', 'api/auth/logout', 'api/health'].sort()
  );
});

test('requireAuth accepts valid session cookie and returns null', async () => {
  const token = await createSessionToken();
  const req = new Request('http://localhost:3000/api/accounts', {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
    },
  });

  const res = await requireAuth(req);
  assert.equal(res, null, 'Expected null for valid cookie');
});

test('requireAuth accepts valid Bearer token and returns null', async () => {
  const token = await createSessionToken();
  const req = new Request('http://localhost:3000/api/accounts', {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const res = await requireAuth(req);
  assert.equal(res, null, 'Expected null for valid Bearer token');
});

test('requireAuth returns 401 when no token is provided', async () => {
  const req = new Request('http://localhost:3000/api/accounts');
  const res = await requireAuth(req);
  assert.ok(res !== null, 'Expected 401 response');
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'Unauthorized. Sign-in required before accessing FinanceOS.');
});

test('requireAuth returns 401 when invalid token is provided', async () => {
  const req = new Request('http://localhost:3000/api/accounts', {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=forged.token.here`,
    },
  });
  const res = await requireAuth(req);
  assert.ok(res !== null, 'Expected 401 response');
  assert.equal(res.status, 401);
});
