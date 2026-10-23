import { Account, Transaction } from './types';

/**
 * Formats a number to Canadian Dollars currency string ($CAD)
 * e.g., formatCAD(-45.5) -> "-$45.50", formatCAD(1250) -> "$1,250.00"
 */
export function formatCAD(amount: number | null | undefined, showPositiveSign = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  if (Math.abs(amount) < 0.005) {
    return '$0.00';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  if (isNegative) {
    return `-${formatted}`;
  }
  if (showPositiveSign && amount > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/**
 * Masks an account or card number, revealing only the last 4 digits
 * e.g., "01842-5357173" -> "****7173", "4505 5302 0756 7254" -> "****7254"
 */
export function maskAccountNumber(acc: string): string {
  if (!acc) return '****';
  const clean = acc.replace(/[\s-]/g, '');
  if (clean.length <= 4) return `****${clean}`;
  return `****${clean.slice(-4)}`;
}

/**
 * Calculates Net Worth: Sum of bank account balances minus sum of credit card balances (debt)
 */
export function calculateNetWorth(accounts: Account[]): {
  netWorth: number;
  totalAssets: number;
  totalDebts: number;
} {
  let totalAssets = 0;
  let totalDebts = 0;

  for (const acc of accounts) {
    const bal = acc.balance || 0;
    if (acc.type === 'bank') {
      totalAssets += bal;
    } else if (acc.type === 'credit_card') {
      // In credit cards, positive balance is amount owed (debt).
      // If negative, card is overpaid (bank owes cardholder money), which counts as an asset.
      if (bal >= 0) {
        totalDebts += bal;
      } else {
        totalAssets += Math.abs(bal);
      }
    }
  }

  return {
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalDebts: Math.round(totalDebts * 100) / 100,
    netWorth: Math.round((totalAssets - totalDebts) * 100) / 100,
  };
}

/**
 * Recalculates running balances chronologically for posted transactions.
 * Excludes pending transactions from balance calculation.
 */
export function recalculateRunningBalances(
  transactions: Transaction[],
  startingBalance = 0
): Transaction[] {
  // Sort ascending by date for ledger calculation, keeping created_at order for same-day
  const sorted = [...transactions].sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    if (a.created_at && b.created_at) {
      return a.created_at.localeCompare(b.created_at);
    }
    return 0;
  });
  let currentBalance = startingBalance;

  const result: Transaction[] = [];
  for (const tx of sorted) {
    if (tx.status === 'posted') {
      currentBalance = Math.round((currentBalance + tx.amount) * 100) / 100;
      result.push({
        ...tx,
        running_balance: currentBalance,
      });
    } else {
      // Pending transactions do not alter the posted ledger running balance
      result.push({
        ...tx,
        running_balance: null,
      });
    }
  }

  return result;
}

/**
 * Smart automatic categorization engine based on transaction description & merchant
 */
export const STANDARD_CATEGORIES = [
  'Transportation - Public Transit',
  'Transportation - Rideshare & Gas',
  'Food - Delivery',
  'Food - Restaurants & Dining',
  'Shopping - Retail & Online',
  'Groceries',
  'Rent & Housing',
  'Utilities & Phone',
  'Income / Payroll',
  'Transfers',
  'Bank Fees',
  'Miscellaneous',
] as const;

function matchWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`, 'i').test(text);
}

/**
 * Smart automatic categorization engine based on transaction description & merchant
 */
export function categorizeMerchant(desc: string): string {
  const text = (desc || '').toUpperCase();

  // 1. Income
  if (text.includes('GARDA') || text.includes('WEST EGG') || text.includes('PAYROLL') || text.includes('DIRECT DEP') || matchWord(text, 'SALARY')) {
    return 'Income / Payroll';
  }
  if (text.includes('TAX REFUND') || text.includes('TPS/GST') || text.includes('DEPOSIT CANADA') || text.includes('BENEFIT')) {
    return 'Income / Payroll';
  }

  // 2. Rent (whole word matches to avoid PARENT, CURRENT, TORRENT)
  if (matchWord(text, 'RENT') || matchWord(text, 'HOUSING') || matchWord(text, 'LANDLORD') || matchWord(text, 'MORTGAGE')) {
    return 'Rent & Housing';
  }

  // 3. Food - Delivery
  if (text.includes('UBER EATS') || text.includes('UBEREATS') || text.includes('DOORDASH') || text.includes('DOOR DASH') || text.includes('SKIP THE DISHES') || text.includes('SKIPTODISHES')) {
    return 'Food - Delivery';
  }

  // 4. Food - Restaurants & Cafes
  if (text.includes('TIM HORTON') || matchWord(text, 'TIMS') || text.includes('MCDONALD') || matchWord(text, 'SUBWAY') || text.includes('CHIPOTLE') ||
      text.includes('TACO BELL') || text.includes('STARBUCKS') || text.includes('CHOW PATI') || matchWord(text, 'DESI') ||
      text.includes('TADKA KING') || text.includes('SEGOVIA') || text.includes('SARAVANAA') || matchWord(text, 'PIZZA') ||
      text.includes('CHAATTER BOX') || matchWord(text, 'RESTAURANT') || matchWord(text, 'RESTURANT') || matchWord(text, 'MOMOS') || text.includes('ANNALAKSHMI') ||
      text.includes('SHAHI RASSOI') || matchWord(text, 'DELHI') || matchWord(text, 'BURGER') || matchWord(text, 'CAFE') || matchWord(text, 'GRILL') || matchWord(text, 'BAKERY')) {
    return 'Food - Restaurants & Dining';
  }

  // 5. Transportation - Public Transit
  if (text.includes('PRESTO') || text.includes('BRAMPTON TRANSIT') || text.includes('MISSISSAUGA') || text.includes('MISSISAUGA') || text.includes('MIWAY') || text.includes('GO TRANSIT') || matchWord(text, 'TTC')) {
    return 'Transportation - Public Transit';
  }

  // 6. Transportation - Rideshare & Gas (match GAS as whole word to avoid VEGAS)
  if (text.includes('UBER') || matchWord(text, 'LYFT') || matchWord(text, 'GAS') || text.includes('PETRO') || matchWord(text, 'SHELL') || matchWord(text, 'ESSO') || text.includes('PIONEER') || matchWord(text, 'MOBIL')) {
    return 'Transportation - Rideshare & Gas';
  }

  // 7. Utilities & Phone (match BELL as whole word to avoid CAMPBELL)
  if (text.includes('FIDO') || text.includes('ROGERS') || matchWord(text, 'BELL') || matchWord(text, 'TELUS') || text.includes('FREEDOM MOBILE') || matchWord(text, 'HYDRO') || text.includes('ENBRIDGE') || matchWord(text, 'UTILITY')) {
    return 'Utilities & Phone';
  }

  // 8. Groceries (match METRO as whole word to avoid METRONOME)
  if (text.includes('FRESHCO') || text.includes('NO FRILLS') || matchWord(text, 'RABBA') || matchWord(text, 'IQBAL') || matchWord(text, 'GROCERY') || matchWord(text, 'FOODS') || matchWord(text, 'METRO') || text.includes('LOBLAWS') || text.includes('SOBEYS') || text.includes('FORTINOS')) {
    return 'Groceries';
  }

  // 9. Shopping - Retail & Online
  if (text.includes('AMAZON') || matchWord(text, 'AMZN') || text.includes('WAL-MART') || text.includes('WALMART') || matchWord(text, 'COSTCO') || matchWord(text, 'TEMU') || matchWord(text, 'APPLE') || matchWord(text, 'WINNERS') || text.includes('BLUENOTES') || matchWord(text, 'INDIGO') || text.includes('BEST BUY') || text.includes('DOLLARAMA') || matchWord(text, 'RETAIL')) {
    return 'Shopping - Retail & Online';
  }

  // 10. Transfers
  if (text.includes('E-TRANSFER') || text.includes('INTERNET TRANSFER') || text.includes('TFR-') || text.includes('TRANSFER')) {
    return 'Transfers';
  }

  // 11. Bank Fees
  if (text.includes('SERVICE CHARGE') || text.includes('ACCOUNT FEE') || text.includes('ANNUAL FEE') || text.includes('CASH ADVANCE FEE')) {
    return 'Bank Fees';
  }

  // 12. Credit Card Payments
  if (text.includes('PAYMENT - THANK YOU') || text.includes('PAYMENT THANK YOU') || text.includes('PAIEMENT MERCI') || text.includes('PREAUTHORIZED DEBIT')) {
    return 'Transfers';
  }

  return 'Miscellaneous';
}

/**
 * Returns standardized shorthand node code for a Canadian bank account
 * e.g., CIBC ACC, CIBC SAV, RBC FIND&SAVE, TD VISA, AMEX GREEN, etc.
 */
export function getNodeLabel(account?: { bank_name?: string; account_name?: string } | null): string {
  if (!account) return 'LEDGER ACC';
  const name = (account.account_name || '').toUpperCase();
  const bank = (account.bank_name || '').toUpperCase();
  if (matchWord(bank, 'CIBC')) {
    if (name.includes('CHEQUING')) return 'CIBC ACC';
    if (name.includes('SAVING')) return 'CIBC SAV';
    if (name.includes('DIVIDEND') || name.includes('VISA')) return 'CIBC VISA';
    return 'CIBC ACC';
  }
  if (matchWord(bank, 'RBC')) {
    if (name.includes('CHEQUING')) return 'RBC ACC';
    if (name.includes('SAVING')) return 'RBC SAV';
    if (name.includes('FIND')) return 'RBC FIND&SAVE';
    return 'RBC SAV';
  }
  if (matchWord(bank, 'TD') || bank.includes('TORONTO-DOMINION') || bank.includes('TORONTO DOMINION')) {
    if (name.includes('CHEQUING')) return 'TD ACC';
    if (name.includes('SAVING')) return 'TD SAV';
    if (name.includes('LOW RATE') || name.includes('VISA')) return 'TD VISA';
    return 'TD ACC';
  }
  if (bank.includes('ROGERS')) return 'ROGERS MC';
  if (bank.includes('AMEX') || bank.includes('AMERICAN EXPRESS')) {
    if (name.includes('GREEN')) return 'AMEX GREEN';
    if (name.includes('ESSENTIAL')) return 'AMEX ESSENTIAL';
    if (name.includes('SIMPLY')) return 'AMEX CASH';
    return 'AMEX CARD';
  }
  return `${bank.slice(0, 4)} ${name.slice(0, 4)}`.trim();
}


/**
 * Whether a transaction belongs in the "To review" queue: pending holds,
 * uncategorised or catch-all categories, unexpected inflows (likely refunds
 * or mis-signed rows) and explicit refunds/cash back.
 */
export function needsReview(tx: { status?: string; category?: string | null; description?: string | null; amount: number }): boolean {
  const cat = (tx.category || '').toLowerCase().trim();
  const desc = (tx.description || '').toLowerCase();
  return (
    tx.status === 'pending' ||
    !cat ||
    cat === 'general' ||
    cat.includes('uncategorized') ||
    cat.includes('misc') ||
    (tx.amount > 0 && !cat.includes('income') && !cat.includes('transfer')) ||
    desc.includes('refund') ||
    desc.includes('cash back')
  );
}
