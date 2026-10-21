import { NextResponse } from 'next/server';
import { db } from '@financeos/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tx = await db.getTransactionById(id);
    if (!tx) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, transaction: tx });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { createTransactionSchema } from '@financeos/shared';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = createTransactionSchema.partial().parse(body);
    // Don't allow overwriting id
    delete (validated as any).id;
    const updated = await db.updateTransaction(id, validated);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, transaction: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await db.deleteTransaction(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
