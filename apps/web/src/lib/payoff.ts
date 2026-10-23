export interface CardDebt {
  id: string;
  name: string;
  shortName: string;
  balance: number;
  apr: number; // decimal, e.g. 0.1299
  aprLabel: string;
  minPayment: number;
}

export interface PayoffResult {
  months: number;
  totalInterestPaid: number;
  paidOff: boolean; // false when the plan never clears the debt within the cap
}

export const MAX_PAYOFF_MONTHS = 360;

/** Typical Canadian minimum: interest plus 1% of the balance, at least $10. */
export function estimateMinPayment(balance: number, apr: number): number {
  if (balance <= 0) return 0;
  return Math.max(10, Math.ceil(balance * (apr / 12) + balance * 0.01));
}

/**
 * Month-by-month payoff simulation. Interest accrues on each balance, every
 * card gets its minimum, and the remaining budget goes to one target card:
 * the highest APR (avalanche) or the smallest balance (snowball). Freed-up
 * minimums roll into the budget as cards are cleared.
 */
export function simulatePayoff(
  input: CardDebt[],
  strategy: 'avalanche' | 'snowball',
  extraMonthly: number
): PayoffResult {
  const cards = input.filter((c) => c.balance > 0.005).map((c) => ({ ...c }));
  const monthlyBudget = cards.reduce((sum, c) => sum + c.minPayment, 0) + Math.max(0, extraMonthly);
  let totalInterestPaid = 0;
  let months = 0;

  while (cards.some((c) => c.balance > 0.005) && months < MAX_PAYOFF_MONTHS) {
    months++;
    let cash = monthlyBudget;

    for (const card of cards) {
      if (card.balance <= 0.005) continue;
      const interest = card.balance * (card.apr / 12);
      totalInterestPaid += interest;
      card.balance += interest;
    }

    for (const card of cards) {
      if (card.balance <= 0.005) continue;
      const payment = Math.min(card.balance, card.minPayment, cash);
      card.balance -= payment;
      cash -= payment;
    }

    const order = cards
      .filter((c) => c.balance > 0.005)
      .sort((a, b) =>
        strategy === 'avalanche' ? b.apr - a.apr || a.balance - b.balance : a.balance - b.balance || b.apr - a.apr
      );
    for (const card of order) {
      if (cash <= 0) break;
      const payment = Math.min(card.balance, cash);
      card.balance -= payment;
      cash -= payment;
    }
  }

  return {
    months,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    paidOff: !cards.some((c) => c.balance > 0.005),
  };
}

/** Order in which a strategy attacks the cards. */
export function payoffOrder(cards: CardDebt[], strategy: 'avalanche' | 'snowball'): CardDebt[] {
  return [...cards]
    .filter((c) => c.balance > 0.005)
    .sort((a, b) =>
      strategy === 'avalanche' ? b.apr - a.apr || a.balance - b.balance : a.balance - b.balance || b.apr - a.apr
    );
}
