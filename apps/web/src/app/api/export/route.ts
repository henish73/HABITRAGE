import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { filtersFromSearchParams, pagingFromSearchParams } from '@/lib/tx-filters';
import { requireAuth } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

/**
 * Stops spreadsheet formula injection: a cell starting with = + - @ (or a tab/CR)
 * would run as a formula when opened in Excel or Sheets, so it gets a leading quote.
 */
function sanitizeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvText(value: string | null | undefined): string {
  return `"${sanitizeCell(String(value ?? '')).replace(/"/g, '""')}"`;
}

const money = (n: number | null | undefined) => (n === null || n === undefined ? '' : n.toFixed(2));

const HEADERS = [
  'Date', 'Bank', 'Account', 'Account_Number', 'Description', 'Merchant', 'Category', 'Type',
  'Amount', 'Debit', 'Credit', 'Running_Balance', 'Status', 'Reference_Number',
];

/** CSV of exactly the transactions the current filters match (same rules as the Activity list). */
export async function GET(req: Request) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const { searchParams } = new URL(req.url);
    const filters = filtersFromSearchParams(searchParams);
    const { limit } = pagingFromSearchParams(searchParams, 50000, 50000);

    const data = await db.getTransactions({ ...filters, page: 1, limit });

    const lines = [HEADERS.map((h) => `"${h}"`).join(',')];
    for (const t of data.transactions) {
      lines.push(
        [
          csvText(t.date),
          csvText(t.account?.bank_name),
          csvText(t.account?.account_name),
          csvText(t.account?.account_number),
          csvText(t.description),
          csvText(t.merchant),
          csvText(t.category),
          csvText(t.type),
          money(t.amount),
          money(t.debit),
          money(t.credit),
          money(t.running_balance),
          csvText(t.status),
          csvText(t.reference_number),
        ].join(',')
      );
    }

    const range = filters.date_from || filters.date_to ? `_${filters.date_from || 'start'}_to_${filters.date_to || 'today'}` : '';
    const filename = `financeos_transactions${range}.csv`;

    // The BOM makes Excel read the file as UTF-8, so accented merchant names stay intact.
    return new Response('﻿' + lines.join('\r\n') + '\r\n', {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Row-Count': String(data.transactions.length),
        'X-Total-Matching': String(data.total),
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ success: false, error: 'Could not create the export.' }, { status: 500 });
  }
}
