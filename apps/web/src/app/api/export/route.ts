import { NextResponse } from 'next/server';
import { db } from '@financeos/db';

export const dynamic = 'force-dynamic';

/**
 * Sanitize a cell value to prevent CSV formula injection.
 * Prefixes dangerous leading chars (=, +, -, @, TAB, CR) with a single-quote
 * so Excel/Sheets treat them as text, not formulas.
 */
function sanitizeCell(value: string): string {
  const dangerous = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerous.some((c) => value.startsWith(c))) {
    return `'${value}`;
  }
  return value;
}

/** Wrap a value in double-quotes, escaping inner double-quotes. */
function csvQuote(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  return `"${sanitizeCell(str).replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const date_from = searchParams.get('date_from') || undefined;
    const date_to = searchParams.get('date_to') || undefined;
    const status = (searchParams.get('status') as any) || undefined;

    // Fetch up to 50,000 rows — caller can add limit param to restrict further
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50000) : 50000;

    const data = await db.getTransactions({
      search,
      date_from,
      date_to,
      status,
      limit,
    });

    const headers = [
      'Date',
      'Bank',
      'Account_Name',
      'Account_Number',
      'Description',
      'Merchant',
      'Category',
      'Amount',
      'Debit',
      'Credit',
      'Running_Balance',
      'Status',
      'Reference_Number',
    ];

    const csvRows = [headers.map(csvQuote).join(',')];

    for (const t of data.transactions) {
      const row = [
        csvQuote(t.date),
        csvQuote(t.account?.bank_name || ''),
        csvQuote(t.account?.account_name || ''),
        csvQuote(t.account?.account_number || ''),
        csvQuote(t.description || ''),
        csvQuote(t.merchant || ''),
        csvQuote(t.category || ''),
        t.amount,                                  // numeric — safe
        t.debit ?? '',                             // numeric
        t.credit ?? '',                            // numeric
        t.running_balance !== null && t.running_balance !== undefined
          ? t.running_balance
          : '',
        csvQuote(t.status),
        csvQuote(t.reference_number || ''),
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="financeos_export_${new Date().toISOString().split('T')[0]}.csv"`,
        'X-Row-Count': String(data.transactions.length),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
