import { NextResponse } from 'next/server';

/**
 * Consistent API error responses. Validation problems return the first issue in plain
 * words (400); anything unexpected is logged on the server and returns a generic
 * message, so internal details (file paths, stack text, database errors) never reach the browser.
 */
export function apiError(error: unknown, status = 500) {
  const e = error as { name?: string; issues?: { path: (string | number)[]; message: string }[]; message?: string };

  if (e?.name === 'ZodError' && Array.isArray(e.issues) && e.issues.length > 0) {
    const issue = e.issues[0];
    const field = issue.path.join('.');
    return NextResponse.json(
      { success: false, error: field ? `${field}: ${issue.message}` : issue.message },
      { status: 400 }
    );
  }

  if (status >= 500) {
    console.error('API error:', error);
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status });
  }

  return NextResponse.json(
    { success: false, error: typeof e?.message === 'string' ? e.message.slice(0, 300) : 'Invalid request.' },
    { status }
  );
}
