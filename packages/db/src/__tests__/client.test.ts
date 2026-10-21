// Data-layer tests. Runs against a throwaway copy of data/seed_cache.json in a temp dir,
// with Postgres disabled, so the real ledger is never touched.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

process.env.DATABASE_URL = 'postgresql://your-supabase-disabled';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'financeos-test-'));
fs.mkdirSync(path.join(tmp, 'data'));
fs.copyFileSync(path.resolve(__dirname, '../../../../data/seed_cache.json'), path.join(tmp, 'data/seed_cache.json'));
process.chdir(tmp);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { db } = require('../client') as typeof import('../client');
import { calculateNetWorth } from '@financeos/shared';

let bankId = '';
let cardId = '';

before(async () => {
  const accounts = await db.getAccounts();
  bankId = accounts.find((a) => a.account_name === 'TD Every Day Chequing')!.id;
  cardId = accounts.find((a) => a.account_name === 'TD Low Rate Visa')!.id;
});

test('uses the temp copy, not the real ledger', () => {
  assert.ok(fs.existsSync(path.join(tmp, 'data/seed_cache.json')));
});

// ---------- balances ----------
test('adding a $10 expense to a bank account lowers its balance by exactly $10', async () => {
  const before = (await db.getAccountById(bankId))!.balance;
  await db.createTransaction({
    account_id: bankId, date: '2026-10-20', description: 'Test', merchant: 'Test',
    category: 'General', amount: -10, status: 'posted',
  });
  const after = (await db.getAccountById(bankId))!.balance;
  assert.equal(Number((before - after).toFixed(2)), 10);
});

test('adding a $10 charge to a credit card INCREASES the debt by $10 (not flips the sign)', async () => {
  const before = (await db.getAccountById(cardId))!.balance; // 709.86 owed
  await db.createTransaction({
    account_id: cardId, date: '2026-10-20', description: 'Test', merchant: 'Test',
    category: 'General', amount: -10, status: 'posted',
  });
  const after = (await db.getAccountById(cardId))!.balance;
  assert.equal(Number((after - before).toFixed(2)), 10, `card balance went ${before} -> ${after}`);
});

test('every account keeps its stored balance after an edit (opening balances respected)', async () => {
  const fresh = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../data/seed_cache.json'), 'utf8'));
  for (const orig of fresh.accounts) {
    if (orig.id === bankId || orig.id === cardId) continue;
    const tx = await db.createTransaction({
      account_id: orig.id, date: '2026-10-20', description: 'probe', merchant: 'probe',
      category: 'General', amount: -1, status: 'posted',
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
  // We added -10 to the bank and -10 to a card: net worth should drop ~$20.
  assert.ok(Math.abs(original - 20 - now) < 0.01, `net worth ${original.toFixed(2)} -> ${now.toFixed(2)}`);
});

test('a pending transaction does not change the posted balance', async () => {
  const before = (await db.getAccountById(bankId))!.balance;
  await db.createTransaction({
    account_id: bankId, date: '2026-10-21', description: 'Hold', merchant: 'Hold',
    category: 'General', amount: -99, status: 'pending',
  });
  assert.equal((await db.getAccountById(bankId))!.balance, before);
});

// ---------- delete ----------
test('deleting a transaction that does not exist reports failure (API should 404)', async () => {
  assert.equal(await db.deleteTransaction('00000000-0000-4000-8000-000000000000'), false);
});

test('deleting an account removes or unlinks its bills', async () => {
  const acc = await db.createAccount({
    type: 'bank', bank_name: 'Test', account_name: 'Temp', account_number: '****0000',
    account_type: 'Chequing', balance: 0,
  });
  await db.createBill({
    name: 'Temp bill', type: 'other', amount: 5, due_day: 1, frequency: 'monthly',
    linked_account_id: acc.id, autopay: false, next_due_date: '2026-11-01', is_paid: false,
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
    account_id: bankId, date: '2026-10-19', description: 'Move me', merchant: 'M',
    category: 'General', amount: -7, status: 'posted',
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
    name: 'EOM', type: 'other', amount: 1, due_day: 31, frequency: 'monthly',
    linked_account_id: null, autopay: false, next_due_date: '2027-01-31', is_paid: false,
  });
  const paid = await db.markBillPaid(bill.id, false);
  assert.equal(paid!.next_due_date, '2027-02-28');
});

test('paying a weekly bill advances 7 days, not a month', async () => {
  const bill = await db.createBill({
    name: 'Weekly', type: 'other', amount: 1, due_day: 1, frequency: 'weekly',
    linked_account_id: null, autopay: false, next_due_date: '2026-11-02', is_paid: false,
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
    name: 'Rent', type: 'rent', amount: 1, due_day: 1, frequency: 'monthly',
    linked_account_id: bankId, autopay: false, next_due_date: '2026-11-01', is_paid: false,
  });
  await db.markBillPaid(bill.id, true);
  const { transactions } = await db.getTransactions({ search: 'Bill Payment: Rent', limit: 1 });
  assert.equal(transactions[0].category, 'Rent & Housing');
});

// ---------- categories ----------
test('creating a category with a quote in its colour does not break SQL (injection guard)', async () => {
  // In Postgres mode color/icon are interpolated into $executeRawUnsafe without escaping.
  const src = fs.readFileSync(path.resolve(__dirname, '../client.ts'), 'utf8');
  assert.ok(!/\$executeRawUnsafe\(/.test(src), 'client.ts still builds SQL by string interpolation');
});

test('deleting a category reassigns its transactions', async () => {
  await db.createCategory({ name: 'ZZ Temp' });
  const tx = await db.createTransaction({
    account_id: bankId, date: '2026-10-18', description: 'cat', merchant: 'c',
    category: 'ZZ Temp', amount: -1, status: 'posted',
  });
  const res = await db.deleteCategory('ZZ Temp', 'Groceries');
  assert.equal(res.affectedCount, 1);
  assert.equal((await db.getTransactionById(tx.id))!.category, 'Groceries');
});
