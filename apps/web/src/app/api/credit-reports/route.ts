import { NextResponse } from 'next/server';
import { db } from '@financeos/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reports = await db.getCreditReports();
    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bureau, file_url, file_name, score, utilization_percent, total_debt, open_accounts, closed_accounts, inquiries, derogatories, extracted_text, extracted_json } = body;

    const newReport = await db.createCreditReport({
      bureau: bureau || 'Equifax',
      file_url: file_url || '',
      file_name: file_name || 'Credit_Report.pdf',
      score: score || 720,
      utilization_percent: utilization_percent || 5.0,
      total_debt: total_debt || 0.0,
      open_accounts: open_accounts || [],
      closed_accounts: closed_accounts || [],
      inquiries: inquiries || [],
      derogatories: derogatories || [],
      extracted_text: extracted_text || '',
      extracted_json: extracted_json || null,
    });

    return NextResponse.json({ success: true, report: newReport }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
