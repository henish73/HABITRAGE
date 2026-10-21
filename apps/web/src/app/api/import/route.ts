import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { categorizeMerchant } from '@financeos/shared';

export const dynamic = 'force-dynamic';

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeDate(raw: string): string {
  const clean = raw.trim().replace(/^['"]|['"]$/g, '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const slashParts = clean.split('/');
  if (slashParts.length === 3) {
    let [p1, p2, p3] = slashParts.map((s) => s.trim());
    if (p3.length === 2) p3 = '20' + p3;
    if (p1.length === 4) {
      return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
    }
    const n1 = parseInt(p1, 10);
    const n2 = parseInt(p2, 10);
    if (n1 > 12) {
      return `${p3}-${String(n2).padStart(2, '0')}-${String(n1).padStart(2, '0')}`;
    }
    return `${p3}-${String(n1).padStart(2, '0')}-${String(n2).padStart(2, '0')}`;
  }
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

function parseAmount(raw: string): number {
  if (!raw) return 0;
  let clean = raw.replace(/[$\s]/g, '');
  if (clean.startsWith('(') && clean.endsWith(')')) {
    clean = '-' + clean.slice(1, -1);
  }
  clean = clean.replace(/,/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
}

export async function POST(req: Request) {
  try {
    const { csvContent, targetAccountId } = await req.json();

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json({ success: false, error: 'No CSV content provided' }, { status: 400 });
    }

    const rows = parseCSV(csvContent);
    if (rows.length < 2) {
      return NextResponse.json({ success: false, error: 'CSV file is empty or missing headers' }, { status: 400 });
    }

    const headers = rows[0].map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    const accounts = await db.getAccounts();
    const defaultAccountId = targetAccountId || (accounts.length > 0 ? accounts[0].id : '');

    // Existing transactions map for duplicate detection
    const existing = await db.getTransactions({
      account_ids: defaultAccountId ? [defaultAccountId] : undefined,
      limit: 5000,
    });
    const existingKeys = new Set(
      existing.transactions.map((t) => `${t.date}|${t.amount}|${(t.description || '').toLowerCase().trim()}`)
    );

    let dateIdx = headers.findIndex((h) => h === 'date' || h.includes('transaction date') || h.includes('posting date'));
    if (dateIdx === -1) dateIdx = headers.findIndex((h) => h.includes('date'));

    let descIdx = headers.findIndex((h) => h === 'description' || h === 'payee' || h === 'merchant' || h === 'memo' || h.includes('transaction desc'));
    if (descIdx === -1) descIdx = headers.findIndex((h) => (h.includes('desc') || h.includes('merchant')) && !h.includes('account'));
    if (descIdx === -1) descIdx = headers.findIndex((h) => h === 'name' || h.includes('details'));

    let amtIdx = headers.findIndex((h) => h === 'amount' || h.includes('amount') || h.includes('cad') || h.includes('total'));
    const debitIdx = headers.findIndex((h) => h.includes('debit') || h.includes('withdrawal'));
    const creditIdx = headers.findIndex((h) => h.includes('credit') || h.includes('deposit'));

    let importedCount = 0;
    let skippedDuplicates = 0;
    const importedTransactions = [];

    for (let i = 1; i < rows.length; i++) {
      const parts = rows[i];
      if (parts.length < 2) continue;

      let date = new Date().toISOString().split('T')[0];
      let desc = 'Imported Transaction';
      let amount = 0;

      if (dateIdx !== -1 && parts[dateIdx]) {
        date = normalizeDate(parts[dateIdx]);
      }
      if (descIdx !== -1 && parts[descIdx]) {
        desc = parts[descIdx];
      }

      if (amtIdx !== -1 && parts[amtIdx]) {
        amount = parseAmount(parts[amtIdx]);
      } else if (debitIdx !== -1 || creditIdx !== -1) {
        const debit = debitIdx !== -1 && parts[debitIdx] ? parseAmount(parts[debitIdx]) : 0;
        const credit = creditIdx !== -1 && parts[creditIdx] ? parseAmount(parts[creditIdx]) : 0;
        if (debit > 0) amount = -debit;
        else if (credit > 0) amount = credit;
      }

      const dupKey = `${date}|${amount}|${desc.toLowerCase().trim()}`;
      if (existingKeys.has(dupKey)) {
        skippedDuplicates++;
        continue;
      }
      existingKeys.add(dupKey);

      const category = categorizeMerchant(desc);

      const tx = await db.createTransaction({
        account_id: defaultAccountId,
        date,
        description: desc,
        merchant: desc.substring(0, 30),
        category,
        amount,
        debit: amount < 0 ? Math.abs(amount) : null,
        credit: amount > 0 ? amount : null,
        status: 'posted',
        source_file: 'manual_csv_import',
      });

      importedTransactions.push(tx);
      importedCount++;
    }

    return NextResponse.json({
      success: true,
      count: importedCount,
      skippedDuplicates,
      message: `Successfully imported ${importedCount} transactions (${skippedDuplicates} duplicates skipped).`,
      transactions: importedTransactions.slice(0, 10),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
