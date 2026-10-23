/**
 * Returns an in-app path to send the user to after login, or '/' if the
 * requested destination could leave the app (absolute URLs, protocol-relative
 * "//host" paths, backslash tricks, javascript: URLs, etc.).
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || typeof next !== 'string') return '/';
  const value = next.trim();
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//') || value.startsWith('/\\')) return '/';
  if (/[\u0000-\u001f\\]/.test(value)) return '/';
  if (value === '/login' || value.startsWith('/login?') || value.startsWith('/api/')) return '/';
  return value;
}
