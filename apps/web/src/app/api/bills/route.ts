import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { createBillSchema } from '@financeos/shared';
import { apiError } from '@/lib/api-error';
import { requireAuth } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const bills = await db.getBills();
    return NextResponse.json({ success: true, bills });
  } catch (error: any) {
    return apiError(error, 500);
  }
}

export async function POST(req: Request) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

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
