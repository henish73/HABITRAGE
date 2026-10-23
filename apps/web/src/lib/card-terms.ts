/**
 * Interest and due-date terms for a credit card account.
 *
 * An APR stored on the account always wins. Otherwise we fall back to the
 * published rate for known Canadian card products and flag it as an estimate,
 * so the UI can say "estimated" instead of presenting a guess as fact.
 * Charge cards (e.g. Amex Green) have no APR: the balance is due in full.
 */
export interface CardTerms {
  apr: number | null; // decimal, e.g. 0.1299; null for charge cards
  aprLabel: string;
  isChargeCard: boolean;
  isEstimate: boolean;
}

interface CardLike {
  account_name?: string;
  bank_name?: string;
  apr?: number | null;
}

const KNOWN_PRODUCTS: { match: (name: string, bank: string) => boolean; apr: number | null }[] = [
  { match: (n) => n.includes('green'), apr: null }, // Amex Green: charge card
  { match: (n) => n.includes('essential'), apr: 0.1299 }, // Amex Essential
  { match: (n) => n.includes('low rate'), apr: 0.1299 }, // TD Low Rate Visa
  { match: (n, b) => n.includes('simplycash') || (b.includes('american express') && n.includes('cash')), apr: 0.2199 },
  { match: (n, b) => b.includes('rogers') || n.includes('rogers'), apr: 0.1999 },
  { match: (n) => n.includes('dividend'), apr: 0.2099 }, // CIBC Dividend Visa
];

const DEFAULT_APR = 0.1999;

function formatApr(apr: number): string {
  return `${(apr * 100).toFixed(2)}%`;
}

export function getCardTerms(card: CardLike): CardTerms {
  if (typeof card.apr === 'number' && card.apr >= 0) {
    return { apr: card.apr, aprLabel: formatApr(card.apr), isChargeCard: false, isEstimate: false };
  }
  const name = (card.account_name || '').toLowerCase();
  const bank = (card.bank_name || '').toLowerCase();
  const known = KNOWN_PRODUCTS.find((p) => p.match(name, bank));
  if (known && known.apr === null) {
    return { apr: null, aprLabel: 'Charge card', isChargeCard: true, isEstimate: false };
  }
  const apr = known ? (known.apr as number) : DEFAULT_APR;
  return { apr, aprLabel: `${formatApr(apr)} est.`, isChargeCard: false, isEstimate: true };
}

/** "Due Oct 28", or "No due date set" when the account doesn't store one. */
export function formatDueDate(dueDate: string | null | undefined): string {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}/.test(dueDate)) return 'No due date set';
  const d = new Date(`${dueDate.slice(0, 10)}T12:00:00Z`);
  if (isNaN(d.getTime())) return 'No due date set';
  return `Due ${d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
}
