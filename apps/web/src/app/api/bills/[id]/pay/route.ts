import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { apiError } from '@/lib/api-error';
import { requireAuth } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const createTx = body.create_transaction ?? true;

    const paidBill = await db.markBillPaid(id, createTx);
    if (!paidBill) {
      return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: 'Bill marked as paid and advanced to next month',
      bill: paidBill,
    });
  } catch (error: any) {
    return apiError(error, 500);
  }
}
