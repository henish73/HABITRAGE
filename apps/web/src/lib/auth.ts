// Web Crypto-based session signing and verification for Edge Middleware & Node.js

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DEV_SECRET = 'financeos-dev-only-secret';
const DEV_PASSCODE = 'vault2026';

export const SESSION_COOKIE_NAME = 'financeos_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Session signing key. Development falls back to a fixed key; production
 * refuses to sign or verify anything until AUTH_SECRET (32+ chars) is set,
 * so a missing variable can never leave sessions forgeable.
 */
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.FINANCEOS_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (IS_PRODUCTION) {
    throw new Error('AUTH_SECRET must be set to at least 32 characters in production.');
  }
  return secret || DEV_SECRET;
}

/** The vault passcode. Production requires FINANCEOS_PASSCODE to be set. */
export function getMasterPasscode(): string {
  const passcode = process.env.FINANCEOS_PASSCODE || process.env.ADMIN_PASSWORD;
  if (passcode) return passcode;
  if (IS_PRODUCTION) {
    throw new Error('FINANCEOS_PASSCODE must be set in production.');
  }
  return DEV_PASSCODE;
}

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(getAuthSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToUint8Array(hex: string): Uint8Array<ArrayBuffer> {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map(byte => parseInt(byte, 16)));
}

/**
 * Creates a signed session token: `<timestamp>.<signature>`
 */
export async function createSessionToken(): Promise<string> {
  const timestamp = Date.now().toString();
  const enc = new TextEncoder();
  const key = await getCryptoKey();
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(`financeos-session:${timestamp}`)
  );
  const signatureHex = bufferToHex(signatureBuffer);
  return `${timestamp}.${signatureHex}`;
}

/**
 * Verifies a session token. Valid for 30 days.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestampStr, signatureHex] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  const maxAge = SESSION_MAX_AGE_SECONDS * 1000;
  if (Date.now() - timestamp > maxAge || timestamp > Date.now() + 60000) {
    return false;
  }

  try {
    const enc = new TextEncoder();
    const key = await getCryptoKey();
    const sigBytes = hexToUint8Array(signatureHex);
    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(`financeos-session:${timestampStr}`)
    );
  } catch {
    return false;
  }
}
