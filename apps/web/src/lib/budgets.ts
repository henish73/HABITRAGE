/**
 * Monthly budgets grouped from the ledger's real category names
 * (e.g. "Food - Restaurants & Dining" and "Food - Delivery" both count as Dining out).
 */
export interface BudgetGroup {
  key: string;
  label: string;
  defaultTarget: number;
  matches: (category: string) => boolean;
}

export const BUDGET_GROUPS: BudgetGroup[] = [
  { key: 'dining', label: 'Dining out', defaultTarget: 300, matches: (c) => c.startsWith('food -') || c.includes('dining') },
  { key: 'groceries', label: 'Groceries', defaultTarget: 250, matches: (c) => c.startsWith('groceries') },
  { key: 'transport', label: 'Transportation', defaultTarget: 250, matches: (c) => c.startsWith('transportation') },
  { key: 'shopping', label: 'Shopping', defaultTarget: 200, matches: (c) => c.startsWith('shopping') },
  { key: 'utilities', label: 'Utilities & phone', defaultTarget: 120, matches: (c) => c.startsWith('utilities') },
  { key: 'subscriptions', label: 'Subscriptions', defaultTarget: 50, matches: (c) => c.startsWith('subscription') },
  { key: 'fees', label: 'Bank fees', defaultTarget: 15, matches: (c) => c.startsWith('bank fee') },
];

// Money moved between your own accounts or flagged as adjustments isn't spending.
const NOT_SPENDING = ['transfers', 'adjustments not to consider', 'income / payroll'];

interface TxLike {
  date: string;
  amount: number;
  status?: string;
  type?: string | null;
  category?: string | null;
}

export interface BudgetLine {
  key: string;
  label: string;
  spent: number;
  target: number;
  pct: number;
}

/** YYYY-MM for a date, in local time. */
export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function computeBudgets(
  transactions: TxLike[],
  month: string,
  targets: Record<string, number> = {}
): BudgetLine[] {
  const spent: Record<string, number> = {};
  for (const t of transactions) {
    if (t.status && t.status !== 'posted') continue;
    if (!t.date?.startsWith(month) || t.amount >= 0) continue;
    if ((t.type || '').toLowerCase() === 'transfers') continue;
    const category = (t.category || '').split(',')[0].trim().toLowerCase();
    if (NOT_SPENDING.includes(category)) continue;
    const group = BUDGET_GROUPS.find((g) => g.matches(category));
    if (group) spent[group.key] = (spent[group.key] || 0) + Math.abs(t.amount);
  }
  return BUDGET_GROUPS.map((g) => {
    const target = targets[g.key] > 0 ? targets[g.key] : g.defaultTarget;
    const value = Math.round((spent[g.key] || 0) * 100) / 100;
    return { key: g.key, label: g.label, spent: value, target, pct: target > 0 ? Math.round((value / target) * 100) : 0 };
  });
}
