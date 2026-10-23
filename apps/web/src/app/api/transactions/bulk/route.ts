import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { sanitizeFilters, TX_TYPES } from '@/lib/tx-filters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_BULK = 20000;

/**
 * Bulk actions on transactions, by explicit ids or by "everything matching these filters".
 *
 * Selecting by filters is guarded: the client sends how many rows it expects
 * (`expected_count`), and the request is refused if the ledger has changed since,
 * so a stale screen can never delete or edit a different set than the one the user saw.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
    }
    const { action, category, categories, status, mode, type, all_matching, filters, expected_count } = body as Record<string, any>;

    if (action !== 'delete' && action !== 'update') {
      return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
    }

    let ids: string[] = Array.isArray(body.ids) ? body.ids.filter((i: unknown) => typeof i === 'string') : [];

    if (all_matching) {
      const matchRes = await db.getTransactions({ ...sanitizeFilters(filters), limit: MAX_BULK, page: 1 });
      if (typeof expected_count !== 'number' || matchRes.total !== expected_count) {
        return NextResponse.json(
          { success: false, error: 'The list changed since you selected it. Reload and try again.' },
          { status: 409 }
        );
      }
      ids = matchRes.transactions.map((t: any) => t.id);
    }

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'No matching transactions to change.' }, { status: 400 });
    }
    if (ids.length > MAX_BULK) {
      return NextResponse.json({ success: false, error: `Too many transactions at once (max ${MAX_BULK}).` }, { status: 400 });
    }

    if (action === 'delete') {
      const count = await db.bulkDeleteTransactions(ids);
      return NextResponse.json({ success: true, count, ids, message: `Deleted ${count} transactions` });
    }

    // update: only known fields with known values
    if (type !== undefined && !(TX_TYPES as readonly string[]).includes(type)) {
      return NextResponse.json({ success: false, error: 'Type must be Inflow, Outflow or Transfers.' }, { status: 400 });
    }
    if (status !== undefined && status !== 'posted' && status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Status must be posted or pending.' }, { status: 400 });
    }
    if (mode !== undefined && mode !== 'replace' && mode !== 'append') {
      return NextResponse.json({ success: false, error: 'Mode must be replace or append.' }, { status: 400 });
    }
    const cleanCategory = typeof category === 'string' ? category.trim().slice(0, 100) : undefined;
    const cleanCategories = Array.isArray(categories)
      ? categories.filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0).map((c) => c.trim().slice(0, 100))
      : undefined;
    if (cleanCategory === undefined && !cleanCategories?.length && status === undefined && type === undefined) {
      return NextResponse.json({ success: false, error: 'Nothing to update.' }, { status: 400 });
    }

    const count = await db.bulkUpdateTransactions(ids, {
      category: cleanCategory || undefined,
      categories: cleanCategories?.length ? cleanCategories : undefined,
      status,
      mode,
      type,
    });
    return NextResponse.json({ success: true, count, ids, message: `Updated ${count} transactions` });
  } catch (error: any) {
    console.error('Bulk transaction error:', error);
    return NextResponse.json({ success: false, error: 'Could not complete the bulk action.' }, { status: 500 });
  }
}
