import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNextPath } from '../safe-redirect';
import { getCardTerms, formatDueDate } from '../card-terms';
import { simulatePayoff, payoffOrder, estimateMinPayment, CardDebt } from '../payoff';
import { computeBudgets } from '../budgets';
import { parseDeleteIntent } from '../delete-intent';

// ---------- safe redirect after login ----------
test('safeNextPath keeps in-app paths with their query', () => {
  assert.equal(safeNextPath('/activity?search=walmart'), '/activity?search=walmart');
  assert.equal(safeNextPath('/plan'), '/plan');
});

test('safeNextPath blocks anything that could leave the app', () => {
  for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'evil', '', null, undefined, '/api/accounts', '/login']) {
    assert.equal(safeNextPath(bad as any), '/', `should block ${String(bad)}`);
  }
});

// ---------- card terms ----------
test('Amex Green is a charge card with no APR', () => {
  const t = getCardTerms({ account_name: 'American Express Green Card', bank_name: 'American Express' });
  assert.equal(t.isChargeCard, true);
  assert.equal(t.apr, null);
});

test('a stored APR beats the product estimate', () => {
  const t = getCardTerms({ account_name: 'TD Low Rate Visa', bank_name: 'TD', apr: 0.0899 });
  assert.equal(t.apr, 0.0899);
  assert.equal(t.isEstimate, false);
});

test('known products without a stored APR are flagged as estimates', () => {
  const t = getCardTerms({ account_name: 'American Express Essential Credit Card', bank_name: 'American Express' });
  assert.equal(t.apr, 0.1299);
  assert.equal(t.isEstimate, true);
  assert.match(t.aprLabel, /est\.$/);
});

test('formatDueDate never invents a date', () => {
  assert.equal(formatDueDate(null), 'No due date set');
  assert.equal(formatDueDate('garbage'), 'No due date set');
  assert.equal(formatDueDate('2026-10-28'), 'Due Oct 28');
});

// ---------- payoff ----------
const debts: CardDebt[] = [
  { id: 'a', name: 'Big low', shortName: 'Big low', balance: 10000, apr: 0.1299, aprLabel: '', minPayment: 250 },
  { id: 'b', name: 'Small high', shortName: 'Small high', balance: 500, apr: 0.2099, aprLabel: '', minPayment: 25 },
];

test('avalanche targets the highest APR, snowball the smallest balance', () => {
  assert.equal(payoffOrder(debts, 'avalanche')[0].id, 'b');
  const mixed = [{ ...debts[0], apr: 0.25 }, debts[1]];
  assert.equal(payoffOrder(mixed, 'avalanche')[0].id, 'a');
  assert.equal(payoffOrder(mixed, 'snowball')[0].id, 'b');
});

test('extra payments shorten payoff and cut interest', () => {
  const base = simulatePayoff(debts, 'avalanche', 0);
  const faster = simulatePayoff(debts, 'avalanche', 300);
  assert.ok(base.paidOff && faster.paidOff);
  assert.ok(faster.months < base.months);
  assert.ok(faster.totalInterestPaid < base.totalInterestPaid);
});

test('payoff reports when minimums never clear the debt', () => {
  const stuck: CardDebt[] = [{ id: 'x', name: 'x', shortName: 'x', balance: 10000, apr: 0.3, aprLabel: '', minPayment: 50 }];
  const r = simulatePayoff(stuck, 'avalanche', 0);
  assert.equal(r.paidOff, false);
});

test('estimated minimum covers at least the interest', () => {
  const min = estimateMinPayment(10000, 0.2);
  assert.ok(min > (10000 * 0.2) / 12);
});

// ---------- budgets ----------
test('budgets group real category names and only count this month', () => {
  const txs = [
    { date: '2026-10-03', amount: -20, status: 'posted', category: 'Food - Restaurants & Dining' },
    { date: '2026-10-05', amount: -10, status: 'posted', category: 'Food - Delivery' },
    { date: '2026-10-06', amount: -30, status: 'posted', category: 'Transportation - Rideshare & Gas' },
    { date: '2026-09-30', amount: -99, status: 'posted', category: 'Food - Delivery' }, // last month
    { date: '2026-10-07', amount: -500, status: 'posted', category: 'Transfers' }, // not spending
    { date: '2026-10-08', amount: -7, status: 'pending', category: 'Groceries' }, // not posted
  ];
  const lines = Object.fromEntries(computeBudgets(txs, '2026-10').map((l) => [l.key, l]));
  assert.equal(lines.dining.spent, 30);
  assert.equal(lines.transport.spent, 30);
  assert.equal(lines.groceries.spent, 0);
});

test('custom budget targets override defaults', () => {
  const lines = computeBudgets([], '2026-10', { dining: 123 });
  assert.equal(lines.find((l) => l.key === 'dining')!.target, 123);
});

// ---------- copilot delete phrases ----------
const now = new Date('2026-10-21T12:00:00');
test('parses common delete requests', () => {
  assert.deepEqual(parseDeleteIntent('Remove the duplicate Uber charge from yesterday', now), {
    merchant: 'Uber', date: '2026-10-20', accountHint: undefined, amount: undefined,
  });
  assert.equal(parseDeleteIntent('delete my Tim Hortons purchase', now)?.merchant, 'Tim Hortons');
  assert.equal(parseDeleteIntent('Delete the uber charge on my TD Visa card', now)?.accountHint, 'TD Visa');
  assert.equal(parseDeleteIntent('Please delete the $5.82 Uber transaction', now)?.amount, 5.82);
});

test('ignores messages that are not transaction deletes', () => {
  for (const m of ['how do I remove a category?', 'delete my budget', "what's my net worth", 'remove the Rogers bill']) {
    assert.equal(parseDeleteIntent(m, now), null, m);
  }
});

// ---------- shared transaction filters ----------
import { sanitizeFilters, filtersFromSearchParams, pagingFromSearchParams, filtersToQuery } from '../tx-filters';
import { presetRange, normalizeRange, toLocalISO } from '../dates';

test('filters drop unknown values and bad input', () => {
  const f = sanitizeFilters({ status: 'bogus', type: 'Hack', sort_by: 'password', sort_order: 'sideways', date_from: '2026-13-45', amount_min: 'abc', evil: 'x' });
  assert.equal(f.status, undefined);
  assert.equal(f.type, undefined);
  assert.equal(f.sort_by, 'date');
  assert.equal(f.sort_order, 'desc');
  assert.equal(f.date_from, undefined);
  assert.equal(f.amount_min, undefined);
  assert.ok(!('evil' in f));
});

test('a reversed date range or amount range is put the right way round', () => {
  const f = sanitizeFilters({ date_from: '2026-10-20', date_to: '2026-10-01', amount_min: '50', amount_max: '5' });
  assert.equal(f.date_from, '2026-10-01');
  assert.equal(f.date_to, '2026-10-20');
  assert.equal(f.amount_min, 5);
  assert.equal(f.amount_max, 50);
});

test('filters read from a query string, including repeated values', () => {
  const f = filtersFromSearchParams(new URLSearchParams('type=Inflow&status=all&needs_review=true&categories=Groceries&categories=Bank%20Fees&search=%20walmart%20'));
  assert.equal(f.type, 'Inflow');
  assert.equal(f.status, undefined); // "all" means no status filter
  assert.equal(f.needs_review, true);
  assert.deepEqual(f.categories, ['Groceries', 'Bank Fees']);
  assert.equal(f.search, 'walmart');
});

test('paging is clamped', () => {
  assert.deepEqual(pagingFromSearchParams(new URLSearchParams('page=-4&limit=999999'), 5000), { page: 1, limit: 5000 });
  assert.deepEqual(pagingFromSearchParams(new URLSearchParams('page=3&limit=0'), 5000), { page: 3, limit: 1 });
  assert.deepEqual(pagingFromSearchParams(new URLSearchParams(''), 5000), { page: 1, limit: 50 });
});

test('filters survive a round trip through the report link', () => {
  const original = sanitizeFilters({ date_from: '2026-10-01', date_to: '2026-10-20', type: 'Outflow', categories: ['Groceries'], amount_min: 10, sort_by: 'amount', sort_order: 'asc' });
  const again = filtersFromSearchParams(new URLSearchParams(filtersToQuery(original)));
  assert.deepEqual(again, original);
});

// ---------- local-time date helpers ----------
test('date presets use local dates and cover the right days', () => {
  const now = new Date(2026, 9, 21, 23, 30); // Oct 21 2026, 11:30pm local: UTC math would call this Oct 22
  assert.deepEqual(presetRange('7D', now), { from: '2026-10-15', to: '2026-10-21' });
  assert.deepEqual(presetRange('this_month', now), { from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(presetRange('last_month', now), { from: '2026-09-01', to: '2026-09-30' });
  assert.deepEqual(presetRange('YTD', now), { from: '2026-01-01', to: '2026-10-21' });
  assert.deepEqual(presetRange('all', now), { from: '', to: '' });
});

test('last month works across a year boundary and in leap years', () => {
  assert.deepEqual(presetRange('last_month', new Date(2027, 0, 15)), { from: '2026-12-01', to: '2026-12-31' });
  assert.deepEqual(presetRange('last_month', new Date(2028, 2, 10)), { from: '2028-02-01', to: '2028-02-29' });
});

test('normalizeRange and toLocalISO', () => {
  assert.deepEqual(normalizeRange('2026-10-20', '2026-10-01'), { from: '2026-10-01', to: '2026-10-20' });
  assert.deepEqual(normalizeRange('', '2026-10-01'), { from: '', to: '2026-10-01' });
  assert.equal(toLocalISO(new Date(2026, 0, 5)), '2026-01-05');
});
