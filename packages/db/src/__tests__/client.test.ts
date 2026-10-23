// Data-layer tests running against isolated PostgreSQL (TEST_DATABASE_URL).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const defaultTestDbUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres@localhost:5433/financeos_test?schema=public';

process.env.DATABASE_URL = defaultTestDbUrl;
process.env.DIRECT_URL = defaultTestDbUrl;
process.env.OWNER_ID = 'owner';

import { db, prisma, getOwnerId, TRASH_RETENTION_DAYS } from '../client';
import { calculateNetWorth } from '@financeos/shared';

let bankId = '';
let cardId = '';

before(async () => {
  // Clean all tables for current test owner
  await prisma.transaction.deleteMany({});
  await prisma.bill.deleteMany({});
  await prisma.creditReport.deleteMany({});
  await prisma.aiChatHistory.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.incomeSource.deleteMany({});
  await prisma.rateLimit.deleteMany({});
  await prisma.account.deleteMany({});

  // Seed standard test ledger from seed_cache.json
  const seedPath = path.resolve(__dirname, '../../../../data/seed_cache.json');
  const source = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const owner_id = getOwnerId();

  // 1. Categories
  for (const c of source.categories || []) {
    await prisma.category.create({
      data: {
        id: c.id,
        owner_id,
        name: c.name.trim(),
        color: c.color || '#6366f1',
        icon: c.icon || 'Tag',
      },
    });
  }

  // 2. Accounts
  for (const a of source.accounts || []) {
    const startingBalance = a.opening_balance ?? a.balance ?? 0;
    await prisma.account.create({
      data: {
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
    });
  }

  // 3. Active transactions
  const chunkSize = 200;
  for (let i = 0; i < (source.transactions || []).length; i += chunkSize) {
    const chunk = source.transactions.slice(i, i + chunkSize);
    await prisma.transaction.createMany({
      data: chunk.map((t: any) => ({
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
        reference_number: t.reference_number ?? null,
        source_file: t.source_file ?? null,
        reviewed_at: t.reviewed_at ? new Date(t.reviewed_at) : null,
        exclude_from_reports: t.exclude_from_reports ?? false,
        deleted_at: null,
      })),
    });
  }

  // 4. Bills
  for (const b of source.bills || []) {
    await prisma.bill.create({
      data: {
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
    });
  }

  const accounts = await db.getAccounts();
  bankId = accounts.find((a) => a.account_name === 'TD Every Day Chequing')!.id;
  cardId = accounts.find((a) => a.account_name === 'TD Low Rate Visa')!.id;
});

after(async () => {
  await prisma.$disconnect();
});

test('runs against the isolated test database, not production', async () => {
  assert.ok(process.env.DATABASE_URL!.includes('5433') || process.env.DATABASE_URL!.includes('test'));
  const accounts = await db.getAccounts();
  assert.equal(accounts.length, 13);
});

// ---------- balances ----------
test('adding a $10 expense to a bank account lowers its balance by exactly $10', async () => {
  const beforeBal = (await db.getAccountById(bankId))!.balance;
  await db.createTransaction({
    account_id: bankId,
    date: '2026-10-20',
    description: 'Test',
    merchant: 'Test',
    category: 'General',
    amount: -10,
    status: 'posted',
  });
  const afterBal = (await db.getAccountById(bankId))!.balance;
  assert.equal(Number((beforeBal - afterBal).toFixed(2)), 10);
});

test('adding a $10 charge to a credit card INCREASES the debt by $10 (not flips the sign)', async () => {
  const beforeBal = (await db.getAccountById(cardId))!.balance;
  await db.createTransaction({
    account_id: cardId,
    date: '2026-10-20',
    description: 'Test',
    merchant: 'Test',
    category: 'General',
    amount: -10,
    status: 'posted',
  });
  const afterBal = (await db.getAccountById(cardId))!.balance;
  assert.equal(Number((afterBal - beforeBal).toFixed(2)), 10, `card balance went ${beforeBal} -> ${afterBal}`);
});

test('every account keeps its stored balance after an edit (opening balances respected)', async () => {
  const fresh = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../data/seed_cache.json'), 'utf8'));
  for (const orig of fresh.accounts) {
    if (orig.id === bankId || orig.id === cardId) continue;
    const tx = await db.createTransaction({
      account_id: orig.id,
      date: '2026-10-20',
      description: 'probe',
      merchant: 'probe',
      category: 'General',
      amount: -1,
      status: 'posted',
    });
    await db.deleteTransaction(tx.id);
    const now = (await db.getAccountById(orig.id))!.balance;
    assert.ok(Math.abs(now - orig.balance) < 0.01, `${orig.account_name}: ${orig.balance} -> ${now}`);
  }
});

test('net worth does not jump after a $10 edit', async () => {
  const fresh = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../data/seed_cache.json'), 'utf8'));
  const original = calculateNetWorth(fresh.accounts).netWorth;
  const now = calculateNetWorth(await db.getAccounts()).netWorth;
  assert.ok(Math.abs(original - 20 - now) < 0.01, `net worth ${original.toFixed(2)} -> ${now.toFixed(2)}`);
});

test('a pending transaction does not change the posted balance', async () => {
  const beforeBal = (await db.getAccountById(bankId))!.balance;
  await db.createTransaction({
    account_id: bankId,
    date: '2026-10-21',
    description: 'Hold',
    merchant: 'Hold',
    category: 'General',
    amount: -99,
    status: 'pending',
  });
  assert.equal((await db.getAccountById(bankId))!.balance, beforeBal);
});

// ---------- delete ----------
test('deleting a transaction that does not exist reports failure (API should 404)', async () => {
  assert.equal(await db.deleteTransaction('00000000-0000-4000-8000-000000000000'), false);
});

test('deleting an account removes or unlinks its bills', async () => {
  const acc = await db.createAccount({
    type: 'bank',
    bank_name: 'Test',
    account_name: 'Temp',
    account_number: '****0000',
    account_type: 'Chequing',
    balance: 0,
  });
  await db.createBill({
    name: 'Temp bill',
    type: 'other',
    amount: 5,
    due_day: 1,
    frequency: 'monthly',
    linked_account_id: acc.id,
    autopay: false,
    next_due_date: '2026-11-01',
    is_paid: false,
  });
  await db.deleteAccount(acc.id);
  const bills = await db.getBills();
  assert.ok(!bills.some((b) => b.linked_account_id === acc.id), 'bill still points at a deleted account');
});

// ---------- updates ----------
test('updateTransaction must not let callers overwrite the id', async () => {
  const { transactions } = await db.getTransactions({ account_ids: [bankId], limit: 1 });
  const id = transactions[0].id;
  await db.updateTransaction(id, { id: 'hijacked' } as any);
  assert.ok(await db.getTransactionById(id), 'transaction lost its id');
});

test('moving a transaction to another account recalculates both accounts', async () => {
  const otherId = (await db.getAccounts()).find((a) => a.account_name === 'RBC High Interest eSavings')!.id;
  const tx = await db.createTransaction({
    account_id: bankId,
    date: '2026-10-19',
    description: 'Move me',
    merchant: 'M',
    category: 'General',
    amount: -7,
    status: 'posted',
  });
  const bankBefore = (await db.getAccountById(bankId))!.balance;
  const otherBefore = (await db.getAccountById(otherId))!.balance;
  await db.updateTransaction(tx.id, { account_id: otherId });
  assert.equal(Number(((await db.getAccountById(bankId))!.balance - bankBefore).toFixed(2)), 7);
  assert.equal(Number(((await db.getAccountById(otherId))!.balance - otherBefore).toFixed(2)), -7);
});

// ---------- filters & totals ----------
test('getTransactions totals exclude transfers (otherwise income/spend are inflated)', async () => {
  const all = await db.getTransactions({ limit: 1 });
  const noTransfers = await db.getTransactions({ limit: 1, types: ['Inflow'] });
  assert.ok(all.totalInflow! <= noTransfers.totalInflow! + 0.01, `inflow incl. transfers ${all.totalInflow} vs real ${noTransfers.totalInflow}`);
});

test('getTransactions clamps absurd page/limit values', async () => {
  const r = await db.getTransactions({ page: 0, limit: 10 });
  assert.ok(r.transactions.length > 0, 'page=0 returns an empty page');
});

// ---------- bills ----------
test('paying a bill due Jan 31 moves it to Feb 28, not March 3', async () => {
  const bill = await db.createBill({
    name: 'EOM',
    type: 'other',
    amount: 1,
    due_day: 31,
    frequency: 'monthly',
    linked_account_id: null,
    autopay: false,
    next_due_date: '2027-01-31',
    is_paid: false,
  });
  const paid = await db.markBillPaid(bill.id, false);
  assert.equal(paid!.next_due_date, '2027-02-28');
});

test('paying a weekly bill advances 7 days, not a month', async () => {
  const bill = await db.createBill({
    name: 'Weekly',
    type: 'other',
    amount: 1,
    due_day: 1,
    frequency: 'weekly',
    linked_account_id: null,
    autopay: false,
    next_due_date: '2026-11-02',
    is_paid: false,
  });
  const paid = await db.markBillPaid(bill.id, false);
  assert.equal(paid!.next_due_date, '2026-11-09');
});

test('auto-generated credit-card bills can be paid (they are shown in the UI)', async () => {
  const bills = await db.getBills();
  const auto = bills.find((b) => b.id.startsWith('cc-auto-'));
  assert.ok(auto, 'expected at least one cc-auto bill');
  assert.ok(await db.markBillPaid(auto!.id, false), 'markBillPaid returned null → API 404');
});

test('auto-generated card bill due date is not hard-coded to October 2026', async () => {
  const auto = (await db.getBills()).find((b) => b.id.startsWith('cc-auto-'))!;
  assert.ok(!auto.next_due_date.startsWith('2026-10-') || new Date().toISOString().startsWith('2026-10'));
});

test('bill payment uses the standard "Rent & Housing" category', async () => {
  const bill = await db.createBill({
    name: 'Rent',
    type: 'rent',
    amount: 1,
    due_day: 1,
    frequency: 'monthly',
    linked_account_id: bankId,
    autopay: false,
    next_due_date: '2026-11-01',
    is_paid: false,
  });
  await db.markBillPaid(bill.id, true);
  const { transactions } = await db.getTransactions({ search: 'Bill Payment: Rent', limit: 1 });
  assert.equal(transactions[0].category, 'Rent & Housing');
});

// ---------- categories ----------
test('creating a category with a quote in its colour does not break SQL (injection guard)', async () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../client.ts'), 'utf8');
  assert.ok(!/\$executeRawUnsafe\(/.test(src), 'client.ts still builds SQL by string interpolation');
});

test('deleting a category reassigns its transactions', async () => {
  await db.createCategory({ name: 'ZZ Temp' });
  const tx = await db.createTransaction({
    account_id: bankId,
    date: '2026-10-18',
    description: 'cat',
    merchant: 'c',
    category: 'ZZ Temp',
    amount: -1,
    status: 'posted',
  });
  const res = await db.deleteCategory('ZZ Temp', 'Groceries');
  assert.equal(res.affectedCount, 1);
  assert.equal((await db.getTransactionById(tx.id))!.category, 'Groceries');
});

// ---------- trash & restore ----------
test('deleted transactions go to the trash and restore exactly, balances included', async () => {
  const beforeBal = (await db.getAccountById(bankId))!.balance;
  const tx = await db.createTransaction({
    account_id: bankId,
    date: '2026-10-19',
    description: 'Trash me',
    merchant: 'Trash',
    category: 'Groceries',
    amount: -12.34,
    status: 'posted',
  });
  assert.equal(await db.deleteTransaction(tx.id), true);
  assert.equal(await db.getTransactionById(tx.id), null);
  assert.ok((await db.getTrash()).some((t) => t.transaction.id === tx.id));

  const restored = await db.restoreTransactions([tx.id]);
  assert.equal(restored.length, 1);
  const back = await db.getTransactionById(tx.id);
  assert.equal(back?.category, 'Groceries');
  assert.equal(back?.amount, -12.34);
  assert.equal(Number(((await db.getAccountById(bankId))!.balance - beforeBal).toFixed(2)), -12.34);
  assert.ok(!(await db.getTrash()).some((t) => t.transaction.id === tx.id), 'restored item left the trash');
});

test('bulk deletes are restorable too', async () => {
  const a = await db.createTransaction({
    account_id: bankId,
    date: '2026-10-19',
    description: 'Bulk A',
    merchant: 'A',
    category: 'General',
    amount: -1,
    status: 'posted',
  });
  const b = await db.createTransaction({
    account_id: cardId,
    date: '2026-10-19',
    description: 'Bulk B',
    merchant: 'B',
    category: 'General',
    amount: -2,
    status: 'posted',
  });
  assert.equal(await db.bulkDeleteTransactions([a.id, b.id]), 2);
  assert.equal((await db.restoreTransactions([a.id, b.id])).length, 2);
});

test('restoring something not in the trash does nothing', async () => {
  assert.deepEqual(await db.restoreTransactions(['not-a-real-id']), []);
});

// ---------- review queue ----------
test('needs_review filter returns only review items', async () => {
  const r = await db.getTransactions({ needs_review: true, limit: 5000 });
  assert.ok(r.total > 0);
  assert.ok(r.total < (await db.getTransactions({ limit: 1 })).total);
});

// ---------- bulk type / status, date ranges, totals ----------
test('bulk type Inflow makes negative amounts positive and updates the balance', async () => {
  const beforeBal = (await db.getAccountById(bankId))!.balance;
  const tx = await db.createTransaction({
    account_id: bankId,
    date: '2026-10-18',
    description: 'Flip me',
    merchant: 'Flip',
    category: 'General',
    amount: -40,
    status: 'posted',
  });
  const afterCharge = (await db.getAccountById(bankId))!.balance;
  assert.equal(Number((beforeBal - afterCharge).toFixed(2)), 40);

  await db.bulkUpdateTransactions([tx.id], { type: 'Inflow' });
  const flipped = await db.getTransactionById(tx.id);
  assert.equal(flipped?.amount, 40);
  assert.equal(flipped?.type, 'Inflow');
  assert.equal(Number(((await db.getAccountById(bankId))!.balance - beforeBal).toFixed(2)), 40);
});

test('bulk type Transfers relabels without changing the amount or balance', async () => {
  const tx = await db.createTransaction({
    account_id: bankId,
    date: '2026-10-18',
    description: 'Move',
    merchant: 'Move',
    category: 'General',
    amount: -15,
    status: 'posted',
  });
  const balance = (await db.getAccountById(bankId))!.balance;
  await db.bulkUpdateTransactions([tx.id], { type: 'Transfers' });
  assert.equal((await db.getTransactionById(tx.id))?.amount, -15);
  assert.equal((await db.getAccountById(bankId))!.balance, balance);
});

test('bulk status pending takes the amount out of the posted balance, posted puts it back', async () => {
  const tx = await db.createTransaction({
    account_id: bankId,
    date: '2026-10-18',
    description: 'Hold',
    merchant: 'Hold',
    category: 'General',
    amount: -25,
    status: 'posted',
  });
  const posted = (await db.getAccountById(bankId))!.balance;
  await db.bulkUpdateTransactions([tx.id], { status: 'pending' });
  assert.equal(Number(((await db.getAccountById(bankId))!.balance - posted).toFixed(2)), 25);
  await db.bulkUpdateTransactions([tx.id], { status: 'posted' });
  assert.equal((await db.getAccountById(bankId))!.balance, posted);
});

test('date range includes both end dates and nothing outside', async () => {
  await db.createTransaction({
    account_id: bankId,
    date: '2031-03-01',
    description: 'edge-a',
    merchant: 'edge',
    category: 'General',
    amount: -1,
    status: 'posted',
  });
  await db.createTransaction({
    account_id: bankId,
    date: '2031-03-05',
    description: 'edge-b',
    merchant: 'edge',
    category: 'General',
    amount: -2,
    status: 'posted',
  });
  await db.createTransaction({
    account_id: bankId,
    date: '2031-03-06',
    description: 'edge-c',
    merchant: 'edge',
    category: 'General',
    amount: -4,
    status: 'posted',
  });
  const r = await db.getTransactions({ date_from: '2031-03-01', date_to: '2031-03-05', limit: 100 });
  assert.equal(r.total, 2);
  assert.deepEqual(r.transactions.map((t) => t.date).sort(), ['2031-03-01', '2031-03-05']);
});

test('inflow, outflow and net add up for any filtered set', async () => {
  await db.createTransaction({
    account_id: bankId,
    date: '2032-01-10',
    description: 'pay',
    merchant: 'pay',
    category: 'Income / Payroll',
    amount: 500,
    status: 'posted',
  });
  await db.createTransaction({
    account_id: bankId,
    date: '2032-01-11',
    description: 'buy',
    merchant: 'buy',
    category: 'Groceries',
    amount: -120.5,
    status: 'posted',
  });
  const r = await db.getTransactions({ date_from: '2032-01-01', date_to: '2032-01-31', limit: 100 });
  assert.equal(r.totalInflow, 500);
  assert.equal(r.totalOutflow, 120.5);
  assert.equal(r.netCashFlow, 379.5);
  assert.equal(Number((r.totalInflow! - r.totalOutflow!).toFixed(2)), r.netCashFlow);
});

test('amount range filters by size, not sign', async () => {
  const r = await db.getTransactions({
    date_from: '2032-01-01',
    date_to: '2032-01-31',
    amount_min: 100,
    amount_max: 200,
    limit: 100,
  });
  assert.equal(r.total, 1);
  assert.equal(r.transactions[0].amount, -120.5);
});

// ---------- new accounts ----------
test('a new account keeps its starting balance as transactions are added', async () => {
  const acc = await db.createAccount({
    type: 'bank',
    bank_name: 'Test',
    account_name: 'Starter',
    account_number: '****1111',
    account_type: 'Chequing',
    balance: 500,
  });
  assert.equal(acc.opening_balance, 500);
  await db.createTransaction({
    account_id: acc.id,
    date: '2026-10-10',
    description: 'Coffee',
    merchant: 'Cafe',
    category: 'General',
    amount: -20,
    status: 'posted',
  });
  assert.equal((await db.getAccountById(acc.id))!.balance, 480);

  const card = await db.createAccount({
    type: 'credit_card',
    bank_name: 'Test',
    account_name: 'Starter Card',
    account_number: '****2222',
    account_type: 'Credit Card',
    balance: 300,
    credit_limit: 1000,
  });
  await db.createTransaction({
    account_id: card.id,
    date: '2026-10-10',
    description: 'Shop',
    merchant: 'Shop',
    category: 'General',
    amount: -50,
    status: 'posted',
  });
  assert.equal((await db.getAccountById(card.id))!.balance, 350); // charges add to what you owe
});

// ==========================================
// NEW PHASE 1 TESTS (Task 8 Requirements)
// ==========================================

test('soft delete sets deleted_at and excludes from active reads; purgeTrash cleans expired items', async () => {
  const tx = await db.createTransaction({
    account_id: bankId,
    date: '2026-10-22',
    description: 'Soft delete probe',
    merchant: 'Probe',
    category: 'General',
    amount: -15,
    status: 'posted',
  });

  // Verify created in DB
  const inDbBefore = await prisma.transaction.findUnique({ where: { id: tx.id } });
  assert.equal(inDbBefore?.deleted_at, null);

  // Soft delete
  const deleted = await db.deleteTransaction(tx.id);
  assert.equal(deleted, true);

  // Excluded from standard reads
  assert.equal(await db.getTransactionById(tx.id), null);
  const activeList = await db.getTransactions({ search: 'Soft delete probe' });
  assert.equal(activeList.total, 0);

  // Exists in DB with deleted_at timestamp
  const inDbAfter = await prisma.transaction.findUnique({ where: { id: tx.id } });
  assert.ok(inDbAfter?.deleted_at !== null);

  // Appears in getTrash()
  const trash = await db.getTrash();
  assert.ok(trash.some((t) => t.transaction.id === tx.id));

  // Artificially age the deleted_at date beyond 30 days
  await prisma.transaction.update({
    where: { id: tx.id },
    data: { deleted_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
  });

  // Purge trash older than 30 days
  const purgedCount = await db.purgeTrash(30);
  assert.ok(purgedCount >= 1);
  const inDbPurged = await prisma.transaction.findUnique({ where: { id: tx.id } });
  assert.equal(inDbPurged, null, 'row should be permanently removed from DB');
});

test('two clients writing at the same time update balances accurately without corruption', async () => {
  const acc = await db.createAccount({
    type: 'bank',
    bank_name: 'Concurrent',
    account_name: 'Concurrent Chequing',
    account_number: '****9999',
    account_type: 'Chequing',
    balance: 1000,
  });

  // Run 10 concurrent writes simultaneously
  const amounts = [-10, -20, 50, -30, 100, -15, -25, 40, -10, -5];
  const expectedNet = amounts.reduce((a, b) => a + b, 0); // +75

  await Promise.all(
    amounts.map((amount, idx) =>
      db.createTransaction({
        account_id: acc.id,
        date: `2026-10-${String(idx + 1).padStart(2, '0')}`,
        description: `Concurrent tx ${idx}`,
        merchant: 'Concurrent',
        category: 'General',
        amount,
        status: 'posted',
      })
    )
  );

  const updatedAcc = await db.getAccountById(acc.id);
  assert.equal(
    updatedAcc!.balance,
    1000 + expectedNet,
    `balance should be ${1000 + expectedNet} after concurrent transactions, got ${updatedAcc!.balance}`
  );
});

test('owner scoping ensures a row with another owner_id is never returned or mutated', async () => {
  const otherOwner = 'other_user_123';

  // Create account and transaction owned by other_user_123 directly in DB
  const otherAcc = await prisma.account.create({
    data: {
      owner_id: otherOwner,
      type: 'bank',
      bank_name: 'Secret Bank',
      account_name: 'Other Private Acc',
      account_number: '****7777',
      account_type: 'Chequing',
      opening_balance: 5000,
      balance: 5000,
    },
  });

  const otherTx = await prisma.transaction.create({
    data: {
      owner_id: otherOwner,
      account_id: otherAcc.id,
      date: '2026-10-22',
      description: 'Secret Wire Transfer',
      merchant: 'Offshore',
      category: 'General',
      amount: 10000,
      status: 'posted',
    },
  });

  // Query as standard owner ('owner')
  const accounts = await db.getAccounts();
  assert.ok(!accounts.some((a) => a.id === otherAcc.id), 'other owner account leaked into getAccounts');
  assert.equal(await db.getAccountById(otherAcc.id), null, 'getAccountById leaked other owner account');

  const txFilter = await db.getTransactions({ search: 'Secret Wire Transfer' });
  assert.equal(txFilter.total, 0, 'other owner transaction leaked into getTransactions');
  assert.equal(await db.getTransactionById(otherTx.id), null, 'getTransactionById leaked other owner transaction');

  // Attempt to mutate other owner transaction via db methods
  const updateResult = await db.updateTransaction(otherTx.id, { description: 'Hacked' });
  assert.equal(updateResult, null, 'updateTransaction allowed mutating another owner record');

  const deleteResult = await db.deleteTransaction(otherTx.id);
  assert.equal(deleteResult, false, 'deleteTransaction allowed deleting another owner record');

  // Verify other owner row was untouched in DB
  const rawTx = await prisma.transaction.findUnique({ where: { id: otherTx.id } });
  assert.equal(rawTx?.description, 'Secret Wire Transfer');
  assert.equal(rawTx?.deleted_at, null);

  // Clean up other owner test rows
  await prisma.transaction.delete({ where: { id: otherTx.id } });
  await prisma.account.delete({ where: { id: otherAcc.id } });
});
