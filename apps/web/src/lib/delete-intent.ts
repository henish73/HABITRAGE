/**
 * Reads a chat message like "remove the duplicate Uber charge from yesterday"
 * and works out whether it asks to delete a transaction, and if so which one:
 * a merchant search term, an optional day, and an optional account hint.
 */
export interface DeleteIntent {
  merchant: string;
  date?: string; // YYYY-MM-DD
  accountHint?: string;
  amount?: number; // absolute dollars, when the message names one
}

const VERB = /\b(delete|remove|erase)\b/i;
const TX_WORDS = /\b(transactions?|charges?|expenses?|purchases?|payments?|entr(?:y|ies))\b/i;
// Things you can also delete that aren't transactions.
const OTHER_TARGETS = /\b(categor(?:y|ies)|accounts?|budgets?|bills?|rules?|chat|history|messages?|reminders?|goals?)\b/i;

const FILLER = new Set([
  'the', 'a', 'an', 'my', 'our', 'that', 'this', 'those', 'these', 'please', 'can', 'you', 'could', 'just',
  'duplicate', 'duplicated', 'double', 'wrong', 'extra', 'last', 'recent', 'latest',
  'transaction', 'transactions', 'charge', 'charges', 'expense', 'expenses', 'purchase', 'purchases',
  'payment', 'payments', 'entry', 'entries', 'from', 'at', 'for', 'of', 'to', 'with', 'and',
  'yesterday', 'today', 'yesterdays', 'todays', 'me', 'i', 'made',
]);

function isoDay(offsetDays: number, now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDeleteIntent(message: string, now = new Date()): DeleteIntent | null {
  const text = (message || '').trim();
  const verb = text.match(VERB);
  if (!verb) return null;
  if (OTHER_TARGETS.test(text) && !TX_WORDS.test(text)) return null;
  // Questions about how to delete things ("how do I remove…") aren't requests.
  if (/^\s*(how|what|why|can i|should i)\b/i.test(text) && !TX_WORDS.test(text)) return null;

  let rest = text.slice((verb.index ?? 0) + verb[0].length);

  const amountMatch = rest.match(/\$\s?(\d{1,6}(?:\.\d{1,2})?)/);
  const amount = amountMatch ? Number(amountMatch[1]) : undefined;

  let date: string | undefined;
  if (/\byesterday('?s)?\b/i.test(rest)) date = isoDay(-1, now);
  else if (/\btoday('?s)?\b/i.test(rest)) date = isoDay(0, now);

  // "… on my TD Visa card" / "… in CIBC chequing" names the account, not the merchant.
  let accountHint: string | undefined;
  const acct = rest.match(/\b(?:on|in|from)\s+my\s+(.+)$/i) || rest.match(/\b(?:on|in)\s+(?:the\s+)?(.+?)\s+(?:card|account|visa|mastercard|chequing|savings)\b.*$/i);
  if (acct) {
    accountHint = acct[1].replace(/\b(card|account)\b/gi, '').replace(/[^\w\s&'-]/g, '').trim() || undefined;
    rest = rest.slice(0, acct.index);
  }

  const words = rest
    .replace(/[^\w\s&'-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w && !FILLER.has(w.toLowerCase()) && !/^\$?\d+(\.\d+)?$/.test(w));

  const merchant = words.join(' ').trim();
  if (merchant.length < 2) return null;
  return { merchant, date, accountHint, amount };
}
