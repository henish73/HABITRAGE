import { formatCAD, maskAccountNumber } from "@financeos/shared";

// Base URL for connecting to local Next.js dev server or Supabase
export const API_BASE = "http://10.0.2.2:3000/api"; // 10.0.2.2 is Android emulator localhost alias

export interface MobileAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  type: "bank" | "credit_card";
  balance: number;
  credit_limit?: number;
}

export interface MobileTransaction {
  id: string;
  date: string;
  description: string;
  merchant: string;
  category: string;
  amount: number;
  status: "posted" | "pending";
}

export const SEED_ACCOUNTS_FALLBACK: MobileAccount[] = [
  { id: "612d1e2a", bank_name: "CIBC", account_name: "CIBC Smart Account", account_number: "****7339", type: "bank", balance: 2138.00 },
  { id: "ea16023e", bank_name: "CIBC", account_name: "CIBC eAdvantage Savings", account_number: "****5832", type: "bank", balance: 0.00 },
  { id: "1db86ad3", bank_name: "TD", account_name: "TD Every Day Chequing", account_number: "****7089", type: "bank", balance: 71.80 },
  { id: "1b5390f2", bank_name: "TD", account_name: "TD High Interest Savings", account_number: "****9086", type: "bank", balance: 0.00 },
  { id: "be25faac", bank_name: "RBC", account_name: "RBC Day to Day Banking", account_number: "****7173", type: "bank", balance: 0.09 },
  { id: "8ba228f0", bank_name: "RBC", account_name: "RBC High Interest eSavings", account_number: "****7181", type: "bank", balance: 0.00 },
  { id: "b11d5d61", bank_name: "RBC", account_name: "RBC NOMI Find & Save", account_number: "****9475", type: "bank", balance: 0.00 },
  { id: "c6575c87", bank_name: "Amex", account_name: "Amex Essential Credit Card", account_number: "****1005", type: "credit_card", balance: 10145.23, credit_limit: 13500 },
  { id: "c9a74401", bank_name: "Amex", account_name: "Amex Green Card", account_number: "****1008", type: "credit_card", balance: 4595.92, credit_limit: 8500 },
  { id: "2d7ed5ca", bank_name: "TD", account_name: "TD Low Rate Visa", account_number: "****1993", type: "credit_card", balance: 709.86, credit_limit: 1000 },
  { id: "860b05ea", bank_name: "Rogers", account_name: "Rogers Mastercard", account_number: "****4379", type: "credit_card", balance: 75.71, credit_limit: 500 },
  { id: "0089d558", bank_name: "CIBC", account_name: "CIBC Dividend Visa", account_number: "****7254", type: "credit_card", balance: 31.44, credit_limit: 3500 },
  { id: "1fe5a648", bank_name: "Amex", account_name: "Amex SimplyCash Card", account_number: "****1008", type: "credit_card", balance: -369.88, credit_limit: 1100 },
];

export const SEED_TRANSACTIONS_FALLBACK: MobileTransaction[] = [
  { id: "t1", date: "2026-10-16", description: "GARDA CANADA PAYROLL", merchant: "Garda Canada", category: "Payroll", amount: 751.30, status: "posted" },
  { id: "t2", date: "2026-10-16", description: "TIM HORTONS #4211 TORONTO", merchant: "Tim Hortons", category: "Dining", amount: -4.85, status: "posted" },
  { id: "t3", date: "2026-10-16", description: "TRANSFER TO CARD PAYMENT", merchant: "Transfer to card", category: "Transfers", amount: -150.00, status: "posted" },
  { id: "t4", date: "2026-10-15", description: "UBER RIDE TRIP", merchant: "Uber", category: "Rideshare", amount: -5.82, status: "posted" },
  { id: "t5", date: "2026-10-15", description: "TD MONTHLY SERVICE FEE", merchant: "TD monthly fee", category: "Bank fees", amount: -5.00, status: "posted" },
  { id: "t6", date: "2026-10-15", description: "INTERAC E-TRANSFER SENT", merchant: "e-Transfer sent", category: "Transfers", amount: -50.50, status: "posted" },
];

export async function fetchAccounts(): Promise<MobileAccount[]> {
  try {
    const res = await fetch(`${API_BASE}/accounts`, { headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.accounts)) {
      return data.accounts;
    }
  } catch {
    // Fall back to seed accounts if dev server/network is unreachable
  }
  return SEED_ACCOUNTS_FALLBACK;
}

export async function fetchTransactions(): Promise<MobileTransaction[]> {
  try {
    const res = await fetch(`${API_BASE}/transactions?limit=50`, { headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.transactions)) {
      return data.transactions;
    }
  } catch {
    // Fall back to seed transactions
  }
  return SEED_TRANSACTIONS_FALLBACK;
}

