import { NextResponse } from 'next/server';
import { db } from '@financeos/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, ids, category, categories, status, mode, type } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'No transaction IDs provided' }, { status: 400 });
    }

    if (action === 'delete') {
      const deletedCount = await db.bulkDeleteTransactions(ids);
      return NextResponse.json({ success: true, count: deletedCount, message: `Deleted ${deletedCount} transactions` });
    }

    if (action === 'update') {
      const updatedCount = await db.bulkUpdateTransactions(ids, { category, categories, status, mode, type });
      return NextResponse.json({ success: true, count: updatedCount, message: `Updated ${updatedCount} transactions` });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
