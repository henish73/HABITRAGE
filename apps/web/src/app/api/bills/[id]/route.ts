import { NextResponse } from 'next/server';
import { db } from '@financeos/db';

export const dynamic = 'force-dynamic';

import { updateBillSchema } from '@financeos/shared';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateBillSchema.partial().parse(body);
    // Don't allow overwriting id
    delete (validated as any).id;
    const updated = await db.updateBill(id, validated);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, bill: updated });
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
    const deleted = await db.deleteBill(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Bill deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
