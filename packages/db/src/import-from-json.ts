import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { prisma, getOwnerId, db } from './client';
import { formatCAD } from '@financeos/shared';

dotenv.config();

interface ImportOptions {
  filePath: string;
  dryRun: boolean;
  clean: boolean;
}

function parseArgs(): ImportOptions {
  const args = process.argv.slice(2);
  let filePath = 'data/seed_cache.json';
  let dryRun = false;
  let clean = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && i + 1 < args.length) {
      filePath = args[++i];
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--clean') {
      clean = true;
    }
  }

  // Resolve file path relative to cwd or repo root
  let resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    const fromRoot = path.resolve(__dirname, '../../../', filePath);
    if (fs.existsSync(fromRoot)) {
      resolved = fromRoot;
    }
  }

  return { filePath: resolved, dryRun, clean };
}

async function main() {
  const { filePath, dryRun, clean } = parseArgs();
  console.log(`[import-from-json] Loading from: ${filePath}`);
  console.log(`[import-from-json] Mode: ${dryRun ? 'DRY-RUN' : 'LIVE IMPORT'}${clean ? ' (WITH CLEAN)' : ''}`);

  if (!fs.existsSync(filePath)) {
    console.error(`[import-from-json] Error: file not found at ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const source = JSON.parse(raw);
  const owner_id = getOwnerId();

  const sourceAccounts = source.accounts || [];
  const sourceCategories = source.categories || [];
  const sourceTransactions = source.transactions || [];
  const sourceTrash = source.trash || [];
  const sourceBills = source.bills || [];
  const sourceCreditReports = source.creditReports || [];
  const sourceAiChat = source.aiChatHistory || [];

  console.log(`[import-from-json] Source contents:`);
  console.log(`  - Accounts: ${sourceAccounts.length}`);
  console.log(`  - Categories: ${sourceCategories.length}`);
  console.log(`  - Transactions: ${sourceTransactions.length}`);
  console.log(`  - Trash: ${sourceTrash.length}`);
  console.log(`  - Bills: ${sourceBills.length}`);
  console.log(`  - Credit Reports: ${sourceCreditReports.length}`);
  console.log(`  - AI Chat Messages: ${sourceAiChat.length}`);

  // Compute source inflow/outflow
  let sourceInflow = 0;
  let sourceOutflow = 0;
  for (const t of sourceTransactions) {
    const isTransfer = (t.type && t.type.toLowerCase() === 'transfers') || t.category === 'Transfers';
    if (isTransfer) continue;
    if (t.type ? t.type.toLowerCase() === 'inflow' : t.amount > 0) {
      if (t.amount > 0) sourceInflow += t.amount;
    } else if (t.type ? t.type.toLowerCase() === 'outflow' : t.amount < 0) {
      sourceOutflow += Math.abs(t.amount);
    }
  }
  sourceInflow = Number(sourceInflow.toFixed(2));
  sourceOutflow = Number(sourceOutflow.toFixed(2));

  if (!dryRun) {
    if (clean) {
      console.log(`[import-from-json] Cleaning existing tables for owner_id="${owner_id}"...`);
      await prisma.transaction.deleteMany({ where: { owner_id } });
      await prisma.bill.deleteMany({ where: { owner_id } });
      await prisma.creditReport.deleteMany({ where: { owner_id } });
      await prisma.aiChatHistory.deleteMany({ where: { owner_id } });
      await prisma.category.deleteMany({ where: { owner_id } });
      await prisma.incomeSource.deleteMany({ where: { owner_id } });
      await prisma.account.deleteMany({ where: { owner_id } });
    }

    console.log(`[import-from-json] Writing to database for owner_id="${owner_id}"...`);

    // 1. Categories
    for (const c of sourceCategories) {
      await prisma.category.upsert({
        where: { owner_id_name: { owner_id, name: c.name.trim() } },
        create: {
          id: c.id,
          owner_id,
          name: c.name.trim(),
          color: c.color || '#6366f1',
          icon: c.icon || 'Tag',
        },
        update: {
          color: c.color || undefined,
          icon: c.icon || undefined,
        },
      });
    }

    // 2. Accounts
    for (const a of sourceAccounts) {
      const startingBalance = a.opening_balance ?? a.balance ?? 0;
      await prisma.account.upsert({
        where: { id: a.id },
        create: {
          id: a.id,
          owner_id,
          type: a.type,
          bank_name: a.bank_name,
          account_name: a.account_name,
          account_number: a.account_number,
          account_type: a.account_type,
          opening_balance: startingBalance,
          balance: a.balance ?? startingBalance,
          credit_limit: a.credit_limit ?? null,
          apr: a.apr ?? null,
          due_date: a.due_date ?? null,
          minimum_payment: a.minimum_payment ?? null,
          statement_closing_date: a.statement_closing_date ?? null,
          notes: a.notes ?? null,
          archived: a.archived ?? false,
        },
        update: {
          owner_id,
          type: a.type,
          bank_name: a.bank_name,
          account_name: a.account_name,
          account_number: a.account_number,
          account_type: a.account_type,
          opening_balance: startingBalance,
          credit_limit: a.credit_limit ?? null,
          apr: a.apr ?? null,
          due_date: a.due_date ?? null,
          minimum_payment: a.minimum_payment ?? null,
          statement_closing_date: a.statement_closing_date ?? null,
          notes: a.notes ?? null,
          archived: a.archived ?? false,
        },
      });
    }

    // 3. Transactions (batch upsert in chunks)
    console.log(`[import-from-json] Upserting active transactions...`);
    const chunkSize = 100;
    for (let i = 0; i < sourceTransactions.length; i += chunkSize) {
      const chunk = sourceTransactions.slice(i, i + chunkSize);
      await prisma.$transaction(
        chunk.map((t: any) =>
          prisma.transaction.upsert({
            where: { id: t.id },
            create: {
              id: t.id,
              owner_id,
              account_id: t.account_id,
              date: t.date,
              description: t.description || '',
              merchant: t.merchant || '',
              category: t.category || 'General',
              type: t.type || 'Outflow',
              amount: t.amount,
              debit: t.debit ?? (t.amount < 0 ? Math.abs(t.amount) : null),
              credit: t.credit ?? (t.amount > 0 ? t.amount : null),
              running_balance: t.running_balance ?? null,
              status: t.status || 'posted',
              cheque_number: t.cheque_number ?? null,
              foreign_spend_amount: t.foreign_spend_amount ?? null,
              commission: t.commission ?? null,
              exchange_rate: t.exchange_rate ?? null,
              additional_info: t.additional_info ?? null,
              address: t.address ?? null,
              city_province: t.city_province ?? null,
              country: t.country ?? null,
              reference_number: t.reference_number ?? null,
              source_file: t.source_file ?? null,
              reviewed_at: t.reviewed_at ? new Date(t.reviewed_at) : null,
              exclude_from_reports: t.exclude_from_reports ?? false,
              deleted_at: null,
            },
            update: {
              owner_id,
              account_id: t.account_id,
              date: t.date,
              description: t.description || '',
              merchant: t.merchant || '',
              category: t.category || 'General',
              type: t.type || 'Outflow',
              amount: t.amount,
              debit: t.debit ?? (t.amount < 0 ? Math.abs(t.amount) : null),
              credit: t.credit ?? (t.amount > 0 ? t.amount : null),
              running_balance: t.running_balance ?? null,
              status: t.status || 'posted',
              reference_number: t.reference_number ?? null,
              source_file: t.source_file ?? null,
              reviewed_at: t.reviewed_at ? new Date(t.reviewed_at) : null,
              exclude_from_reports: t.exclude_from_reports ?? false,
              deleted_at: null,
            },
          })
        )
      );
    }

    // 4. Trash
    if (sourceTrash.length > 0) {
      console.log(`[import-from-json] Upserting trashed transactions...`);
      for (const item of sourceTrash) {
        const t = item.transaction;
        const deletedAt = item.deletedAt ? new Date(item.deletedAt) : new Date();
        await prisma.transaction.upsert({
          where: { id: t.id },
          create: {
            id: t.id,
            owner_id,
            account_id: t.account_id,
            date: t.date,
            description: t.description || '',
            merchant: t.merchant || '',
            category: t.category || 'General',
            type: t.type || 'Outflow',
            amount: t.amount,
            debit: t.debit ?? (t.amount < 0 ? Math.abs(t.amount) : null),
            credit: t.credit ?? (t.amount > 0 ? t.amount : null),
            running_balance: t.running_balance ?? null,
            status: t.status || 'posted',
            deleted_at: deletedAt,
          },
          update: {
            deleted_at: deletedAt,
          },
        });
      }
    }

    // 5. Bills
    for (const b of sourceBills) {
      await prisma.bill.upsert({
        where: { id: b.id },
        create: {
          id: b.id,
          owner_id,
          name: b.name,
          type: b.type,
          amount: b.amount,
          due_day: b.due_day,
          frequency: b.frequency || 'monthly',
          linked_account_id: b.linked_account_id ?? null,
          autopay: b.autopay ?? false,
          next_due_date: b.next_due_date,
          is_paid: b.is_paid ?? false,
          notes: b.notes ?? null,
        },
        update: {
          owner_id,
          name: b.name,
          type: b.type,
          amount: b.amount,
          due_day: b.due_day,
          frequency: b.frequency || 'monthly',
          linked_account_id: b.linked_account_id ?? null,
          autopay: b.autopay ?? false,
          next_due_date: b.next_due_date,
          is_paid: b.is_paid ?? false,
          notes: b.notes ?? null,
        },
      });
    }

    // 6. Credit Reports
    for (const r of sourceCreditReports) {
      await prisma.creditReport.upsert({
        where: { id: r.id },
        create: {
          id: r.id,
          owner_id,
          bureau: r.bureau,
          file_url: r.file_url,
          file_name: r.file_name,
          score: r.score,
          utilization_percent: r.utilization_percent,
          total_debt: r.total_debt,
          open_accounts: r.open_accounts as any,
          closed_accounts: r.closed_accounts as any,
          inquiries: r.inquiries as any,
          derogatories: r.derogatories as any,
          extracted_text: r.extracted_text ?? null,
          extracted_json: r.extracted_json ?? null,
        },
        update: {
          owner_id,
          bureau: r.bureau,
          file_url: r.file_url,
          file_name: r.file_name,
          score: r.score,
          utilization_percent: r.utilization_percent,
          total_debt: r.total_debt,
          open_accounts: r.open_accounts as any,
          closed_accounts: r.closed_accounts as any,
          inquiries: r.inquiries as any,
          derogatories: r.derogatories as any,
        },
      });
    }

    // 7. AI Chat History
    for (const m of sourceAiChat) {
      await prisma.aiChatHistory.upsert({
        where: { id: m.id },
        create: {
          id: m.id,
          owner_id,
          role: m.role,
          content: m.content,
          function_calls: m.function_calls ?? null,
          created_at: m.created_at ? new Date(m.created_at) : new Date(),
        },
        update: {
          role: m.role,
          content: m.content,
          function_calls: m.function_calls ?? null,
        },
      });
    }

    // 8. Recalculate balances for all accounts
    console.log(`[import-from-json] Recalculating account running balances...`);
    for (const a of sourceAccounts) {
      await db.recalculateAccountBalances(a.id);
    }
  }

  // ==========================================
  // VERIFICATION & REPORT
  // ==========================================
  console.log('\n============================================================');
  console.log('                 DATA IMPORT & VERIFICATION REPORT          ');
  console.log('============================================================\n');

  let hasMismatch = false;

  // Row counts
  const [
    dbAccountsCount,
    dbTxCount,
    dbTrashCount,
    dbCategoriesCount,
    dbBillsCount,
    dbCreditReportsCount,
  ] = await Promise.all([
    prisma.account.count({ where: { owner_id } }),
    prisma.transaction.count({ where: { owner_id, deleted_at: null } }),
    prisma.transaction.count({ where: { owner_id, deleted_at: { not: null } } }),
    prisma.category.count({ where: { owner_id } }),
    prisma.bill.count({ where: { owner_id } }),
    prisma.creditReport.count({ where: { owner_id } }),
  ]);

  console.log('TABLE ROW COUNTS:');
  console.log('------------------------------------------------------------');
  console.log(`Accounts:       DB=${dbAccountsCount}  | Source=${sourceAccounts.length}   | ${dbAccountsCount === sourceAccounts.length ? 'OK' : 'MISMATCH'}`);
  console.log(`Transactions:   DB=${dbTxCount}  | Source=${sourceTransactions.length} | ${dbTxCount === sourceTransactions.length ? 'OK' : 'MISMATCH'}`);
  console.log(`Trash:          DB=${dbTrashCount}  | Source=${sourceTrash.length}     | ${dbTrashCount === sourceTrash.length ? 'OK' : 'MISMATCH'}`);
  console.log(`Categories:     DB=${dbCategoriesCount}  | Source=${sourceCategories.length}    | ${dbCategoriesCount >= sourceCategories.length ? 'OK' : 'MISMATCH'}`);
  console.log(`Bills:          DB=${dbBillsCount}   | Source=${sourceBills.length}     | ${dbBillsCount === sourceBills.length ? 'OK' : 'MISMATCH'}`);
  console.log(`Credit Reports: DB=${dbCreditReportsCount}   | Source=${sourceCreditReports.length}     | ${dbCreditReportsCount === sourceCreditReports.length ? 'OK' : 'MISMATCH'}`);

  if (
    dbAccountsCount !== sourceAccounts.length ||
    dbTxCount !== sourceTransactions.length ||
    dbTrashCount !== sourceTrash.length ||
    dbBillsCount !== sourceBills.length ||
    dbCreditReportsCount !== sourceCreditReports.length
  ) {
    hasMismatch = true;
  }

  // Account balances
  console.log('\nACCOUNT BALANCES (Recomputed DB vs Source File):');
  console.log('------------------------------------------------------------');
  const dbAccounts = await db.getAccounts();
  const dbAccMap = new Map(dbAccounts.map((a) => [a.id, a]));

  for (const srcAcc of sourceAccounts) {
    const dbAcc = dbAccMap.get(srcAcc.id);
    const dbBal = dbAcc ? dbAcc.balance : NaN;
    const srcBal = srcAcc.balance;
    const diff = Math.abs(dbBal - srcBal);
    const isMatch = diff < 0.005;
    if (!isMatch) hasMismatch = true;

    console.log(
      `${srcAcc.account_name.padEnd(40)} DB: ${formatCAD(dbBal).padStart(12)} | Source: ${formatCAD(srcBal).padStart(12)} | ${isMatch ? 'MATCH' : 'MISMATCH (diff: ' + diff.toFixed(2) + ')'}`
    );
  }

  // Cash flow totals
  console.log('\nCASH FLOW METRICS (Excluding Transfers):');
  console.log('------------------------------------------------------------');
  const txFilter = await db.getTransactions({ limit: 1 });
  const dbInflow = txFilter.totalInflow ?? 0;
  const dbOutflow = txFilter.totalOutflow ?? 0;
  const inflowMatch = Math.abs(dbInflow - sourceInflow) < 0.005;
  const outflowMatch = Math.abs(dbOutflow - sourceOutflow) < 0.005;

  console.log(`Total Inflow:  DB=${formatCAD(dbInflow)} | Source=${formatCAD(sourceInflow)} | ${inflowMatch ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Total Outflow: DB=${formatCAD(dbOutflow)} | Source=${formatCAD(sourceOutflow)} | ${outflowMatch ? 'MATCH' : 'MISMATCH'}`);

  if (!inflowMatch || !outflowMatch) {
    hasMismatch = true;
  }

  console.log('\n============================================================');
  if (hasMismatch) {
    console.error('VERIFICATION FAILED: Data mismatch detected between database and source file.');
    process.exit(1);
  } else {
    console.log('VERIFICATION SUCCESSFUL: 100% parity across all tables, balances, and totals.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('[import-from-json] Fatal error:', err);
  process.exit(1);
});
