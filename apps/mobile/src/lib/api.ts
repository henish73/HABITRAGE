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
  { id: "1", bank_name: "CIBC", account_name: "CIBC Chequing Account", account_number: "****2509", type: "bank", balance: 5420.30 },
  { id: "2", bank_name: "CIBC", account_name: "CIBC Savings Growth", account_number: "****3102", type: "bank", balance: 12500.00 },
  { id: "3", bank_name: "TD", account_name: "TD Every Day Chequing", account_number: "****4491", type: "bank", balance: 2150.75 },
  { id: "4", bank_name: "TD", account_name: "TD High Interest Savings", account_number: "****8830", type: "bank", balance: 6400.00 },
  { id: "5", bank_name: "RBC", account_name: "RBC Day to Day Banking", account_number: "****1209", type: "bank", balance: 3100.40 },
  { id: "6", bank_name: "RBC", account_name: "RBC Enhanced Savings", account_number: "****5521", type: "bank", balance: 4500.00 },
  { id: "7", bank_name: "CIBC", account_name: "CIBC Dividend Visa", account_number: "****9012", type: "credit_card", balance: 1420.50, credit_limit: 3500 },
  { id: "8", bank_name: "TD", account_name: "TD Low Rate Visa", account_number: "****1142", type: "credit_card", balance: 340.00, credit_limit: 1000 },
  { id: "9", bank_name: "Rogers", account_name: "Rogers Red Mastercard", account_number: "****6633", type: "credit_card", balance: 110.20, credit_limit: 500 },
  { id: "10", bank_name: "AMEX", account_name: "American Express Green Card", account_number: "****3001", type: "credit_card", balance: 1200.00, credit_limit: 8500 },
  { id: "11", bank_name: "AMEX", account_name: "American Express Essential", account_number: "****4002", type: "credit_card", balance: 2150.00, credit_limit: 13500 },
  { id: "12", bank_name: "AMEX", account_name: "American Express Simply Cash", account_number: "****5003", type: "credit_card", balance: 250.00, credit_limit: 1100 },
];

export const SEED_TRANSACTIONS_FALLBACK: MobileTransaction[] = [
  { id: "t1", date: "2024-10-14", description: "LOBLAWS #1042 TORONTO ON", merchant: "Loblaws", category: "Groceries", amount: -84.22, status: "posted" },
  { id: "t2", date: "2024-10-12", description: "SHELL OIL 44100 NORTH YORK ON", merchant: "Shell", category: "Transportation", amount: -65.40, status: "posted" },
  { id: "t3", date: "2024-10-10", description: "PAYROLL DEPOSIT ACME CORP", merchant: "Acme Corp", category: "Income", amount: 2850.00, status: "posted" },
  { id: "t4", date: "2024-10-08", description: "UBER EATS PENDING HOLD", merchant: "Uber Eats", category: "Dining", amount: -38.50, status: "pending" },
  { id: "t5", date: "2024-10-05", description: "ROGERS COMMUNICATIONS", merchant: "Rogers", category: "Utilities", amount: -125.00, status: "posted" },
];
