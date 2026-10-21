/**
 * Crypto utilities for HABITRAGE encrypted vault.
 * Uses AES-GCM for client-side encryption.
 */

export async function encryptKey(rawKey: string, userId: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(userId),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('habitrage-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(rawKey)
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptKey(encryptedBase64: string, userId: string): Promise<string> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  
  const combined = new Uint8Array(
    atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
  );
  
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(userId),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('habitrage-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return dec.decode(decrypted);
}
