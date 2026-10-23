import { NextResponse } from 'next/server';
import { db } from '@financeos/db';

export const dynamic = 'force-dynamic';
import { createBillSchema } from '@financeos/shared';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const bills = await db.getBills();
    return NextResponse.json({ success: true, bills });
  } catch (error: any) {
    return apiError(error, 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = createBillSchema.parse(body);
    const newBill = await db.createBill({
      ...validated,
      is_paid: false,
    });
    return NextResponse.json({ success: true, bill: newBill }, { status: 201 });
  } catch (error: any) {
    return apiError(error, 400);
  }
}
