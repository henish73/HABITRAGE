import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { createCreditReportSchema } from '@financeos/shared';
import { apiError } from '@/lib/api-error';
import { requireAuth } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const reports = await db.getCreditReports();
    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    return apiError(error, 500);
  }
}

export async function POST(req: Request) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const body = await req.json();
    const validated = createCreditReportSchema.parse(body);
    const newReport = await db.createCreditReport({
      ...validated,
      extracted_text: validated.extracted_text ?? '',
      extracted_json: validated.extracted_json ?? null,
    });

    return NextResponse.json({ success: true, report: newReport }, { status: 201 });
  } catch (error: any) {
    return apiError(error, 400);
  }
}
