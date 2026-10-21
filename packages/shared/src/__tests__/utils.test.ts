import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCAD,
  maskAccountNumber,
  calculateNetWorth,
  recalculateRunningBalances,
  categorizeMerchant,
  getNodeLabel,
} from '../utils';
import { createTransactionSchema, createBillSchema } from '../schemas';
import type { Account, Transaction } from '../types';

const acc = (over: Partial<Account>): Account => ({
  id: 'a',
  type: 'bank',
  bank_name: 'CIBC',
  account_name: 'Chequing',
  account_number: '****1234',
  account_type: 'Chequing',
  balance: 0,
  ...over,
});

const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  account_id: 'a',
  date: '2026-01-01',
  description: '',
  merchant: '',
  category: 'General',
  amount: 0,
  status: 'posted',
  ...over,
});

// ---------- formatCAD ----------
test('formatCAD formats positive, negative and signed values', () => {
  assert.equal(formatCAD(1250), '$1,250.00');
  assert.equal(formatCAD(-45.5), '-$45.50');
  assert.equal(formatCAD(10, true), '+$10.00');
  assert.equal(formatCAD(0, true), '$0.00');
});

test('formatCAD handles null/undefined/NaN', () => {
  assert.equal(formatCAD(null), '$0.00');
  assert.equal(formatCAD(undefined), '$0.00');
  assert.equal(formatCAD(NaN), '$0.00');
});

test('formatCAD does not print "-$0.00" for tiny negative float noise', () => {
  // e.g. 0.1 + 0.2 - 0.3 = 5.5e-17, -1e-9 shows up after sums of many floats
  assert.equal(formatCAD(-0.000000001), '$0.00');
});

// ---------- maskAccountNumber ----------
test('maskAccountNumber keeps last 4 digits', () => {
  assert.equal(maskAccountNumber('01842-5357173'), '****7173');
  assert.equal(maskAccountNumber('4505 5302 0756 7254'), '****7254');
  assert.equal(maskAccountNumber(''), '****');
  assert.equal(maskAccountNumber('12'), '****12');
});

// ---------- calculateNetWorth ----------
test('calculateNetWorth: assets minus positive card debt', () => {
  const r = calculateNetWorth([
    acc({ balance: 1000 }),
    acc({ type: 'credit_card', balance: 300 }),
  ]);
  assert.deepEqual(r, { totalAssets: 1000, totalDebts: 300, netWorth: 700 });
});

test('calculateNetWorth: card with credit balance (overpaid) should count as an asset, not be dropped', () => {
  // A card at -50 means the bank owes YOU $50. Math.max(0, …) silently drops it.
  const r = calculateNetWorth([acc({ balance: 100 }), acc({ type: 'credit_card', balance: -50 })]);
  assert.equal(r.netWorth, 150);
});

// ---------- recalculateRunningBalances ----------
test('recalculateRunningBalances: chronological running totals, pending excluded', () => {
  const out = recalculateRunningBalances(
    [
      tx({ id: '2', date: '2026-01-02', amount: -20 }),
      tx({ id: '1', date: '2026-01-01', amount: 100 }),
      tx({ id: 'p', date: '2026-01-03', amount: -5, status: 'pending' }),
    ],
    0
  );
  assert.deepEqual(
    out.map((t) => [t.id, t.running_balance]),
    [['1', 100], ['2', 80], ['p', null]]
  );
});

test('recalculateRunningBalances: same-day items keep created_at order (README promise)', () => {
  const out = recalculateRunningBalances([
    tx({ id: 'late', date: '2026-01-01', amount: -10, created_at: '2026-01-01T12:00:00Z' }),
    tx({ id: 'early', date: '2026-01-01', amount: 50, created_at: '2026-01-01T08:00:00Z' }),
  ]);
  assert.deepEqual(out.map((t) => t.id), ['early', 'late']);
});

test('recalculateRunningBalances: no float drift over many cents', () => {
  const many = Array.from({ length: 1000 }, (_, i) => tx({ id: String(i), amount: 0.1 }));
  const out = recalculateRunningBalances(many);
  assert.equal(out[out.length - 1].running_balance, 100);
});

// ---------- categorizeMerchant ----------
const cases: [string, string][] = [
  ['UBER EATS TORONTO', 'Food - Delivery'],
  ['UBER TRIP HELP.UBER.COM', 'Transportation - Rideshare & Gas'],
  ['PRESTO FARE', 'Transportation - Public Transit'],
  ['ROGERS WIRELESS', 'Utilities & Phone'],
  ['NO FRILLS #123', 'Groceries'],
  ['AMAZON.CA', 'Shopping - Retail & Online'],
  ['E-TRANSFER SENT', 'Transfers'],
  ['PAYMENT - THANK YOU', 'Transfers'],
  ['SERVICE CHARGE', 'Bank Fees'],
  ['RANDOM THING', 'Miscellaneous'],
];
for (const [desc, expected] of cases) {
  test(`categorizeMerchant("${desc}") -> ${expected}`, () => {
    assert.equal(categorizeMerchant(desc), expected);
  });
}

// Substring false positives — these are real bugs in the keyword engine.
const falsePositives: [string, string, string][] = [
  ['PARENT TEACHER ASSOC', 'Rent & Housing', 'contains "RENT"'],
  ['CURRENT ACCOUNT INTEREST', 'Rent & Housing', 'contains "RENT"'],
  ['TORRENT PHARMACY', 'Rent & Housing', 'contains "RENT"'],
  ['VEGAS CASINO', 'Transportation - Rideshare & Gas', 'contains "GAS"'],
  ['CAMPBELL SOUP', 'Utilities & Phone', 'contains "BELL"'],
  ['TIMSBUKTU BOOKS', 'Food - Restaurants & Dining', 'contains "TIMS"'],
  ['METRONOME MUSIC', 'Groceries', 'contains "METRO"'],
];
for (const [desc, wrong, why] of falsePositives) {
  test(`categorizeMerchant should not tag "${desc}" as ${wrong} (${why})`, () => {
    assert.notEqual(categorizeMerchant(desc), wrong);
  });
}

// ---------- getNodeLabel ----------
test('getNodeLabel maps known banks', () => {
  assert.equal(getNodeLabel({ bank_name: 'CIBC', account_name: 'CIBC Smart Account Chequing' }), 'CIBC ACC');
  assert.equal(getNodeLabel({ bank_name: 'American Express', account_name: 'Green Card' }), 'AMEX GREEN');
  assert.equal(getNodeLabel(null), 'LEDGER ACC');
});

test('getNodeLabel: "TD" match should not catch banks merely containing the letters TD', () => {
  // bank.includes('TD') matches e.g. "ATD Credit Union", "LTD"
  assert.notEqual(getNodeLabel({ bank_name: 'Meridian Ltd', account_name: 'Savings' }), 'TD SAV');
});

// ---------- schemas ----------
test('createTransactionSchema rejects impossible dates', () => {
  const base = { account_id: crypto.randomUUID(), description: 'x', amount: -1 };
  assert.equal(createTransactionSchema.safeParse({ ...base, date: '2026-01-15' }).success, true);
  assert.equal(createTransactionSchema.safeParse({ ...base, date: '2026-13-45' }).success, false);
});

test('createTransactionSchema rejects NaN / Infinity amounts', () => {
  const base = { account_id: crypto.randomUUID(), description: 'x', date: '2026-01-01' };
  assert.equal(createTransactionSchema.safeParse({ ...base, amount: Infinity }).success, false);
});

test('createBillSchema enforces positive amount and day range', () => {
  const ok = { name: 'Rent', type: 'rent', amount: 1900, due_day: 1, next_due_date: '2026-11-01' };
  assert.equal(createBillSchema.safeParse(ok).success, true);
  assert.equal(createBillSchema.safeParse({ ...ok, amount: -1 }).success, false);
  assert.equal(createBillSchema.safeParse({ ...ok, due_day: 32 }).success, false);
});
