import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { createTransactionSchema, TransactionFilterParams } from '@financeos/shared';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const params: TransactionFilterParams = {
      search: searchParams.get('search') || undefined,
      account_ids: searchParams.getAll('account_ids').length > 0 ? searchParams.getAll('account_ids') : undefined,
      banks: searchParams.getAll('banks').length > 0 ? searchParams.getAll('banks') : undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      amount_min: searchParams.get('amount_min') ? parseFloat(searchParams.get('amount_min')!) : undefined,
      amount_max: searchParams.get('amount_max') ? parseFloat(searchParams.get('amount_max')!) : undefined,
      categories: searchParams.getAll('categories').length > 0 ? searchParams.getAll('categories') : undefined,
      type: searchParams.get('type') || undefined,
      types: searchParams.getAll('types').length > 0 ? searchParams.getAll('types') : undefined,
      status: (searchParams.get('status') as any) || undefined,
      source_file: searchParams.get('source_file') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
      sort_by: (searchParams.get('sort_by') as any) || 'date',
      sort_order: (searchParams.get('sort_order') as any) || 'desc',
    };

    const result = await db.getTransactions(params);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = createTransactionSchema.parse(body);

    const created = await db.createTransaction(validated as any);
    return NextResponse.json({ success: true, transaction: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
