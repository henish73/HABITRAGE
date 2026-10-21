// Web Crypto-based session signing and verification for Edge Middleware & Node.js

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.FINANCEOS_SECRET || 'financeos-vault-secret-key-salt-2026';
export const MASTER_PASSCODE = process.env.FINANCEOS_PASSCODE || process.env.ADMIN_PASSWORD || 'vault2026';
export const SESSION_COOKIE_NAME = 'financeos_session';

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(AUTH_SECRET),
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

  // Max age: 30 days
  const maxAge = 30 * 24 * 60 * 60 * 1000;
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
