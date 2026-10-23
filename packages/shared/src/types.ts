export type AccountType = 'bank' | 'credit_card';

export type BankName = 'CIBC' | 'TD' | 'RBC' | 'Rogers Bank' | 'American Express' | 'Other';

export interface Account {
  id: string;
  type: AccountType;
  bank_name: string;
  account_name: string;
  account_number: string; // masked, e.g., ****2509
  account_type: string; // e.g., Chequing, Savings, Find & Save, Credit Card
  balance: number;
  opening_balance?: number | null; // balance before the first ledger row (debt for cards)
  credit_limit?: number | null;
  apr?: number | null; // decimal, e.g. 0.1999; blank means use the product estimate
  statement_start_date?: string | null;
  statement_closing_date?: string | null;
  due_date?: string | null;
  minimum_payment?: number | null;
  installment_plan_monthly?: number | null;
  installment_plan_remaining?: number | null;
  installment_plan_notes?: string | null;
  notes?: string | null;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type TransactionStatus = 'posted' | 'pending';

export type TransactionType = 'Inflow' | 'Outflow' | 'Transfers';

export interface CategoryItem {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  date: string; // YYYY-MM-DD
  description: string;
  merchant: string;
  category: string;
  categories?: string[]; // Array of attached categories
  type?: 'Inflow' | 'Outflow' | 'Transfers' | string | null; // Inflow, Outflow, Transfers
  amount: number; // Signed: negative for expense/debit, positive for income/credit
  debit?: number | null; // Positive value representing withdrawal/charge
  credit?: number | null; // Positive value representing deposit/payment
  running_balance?: number | null;
  status: TransactionStatus;
  cheque_number?: string | null;
  foreign_spend_amount?: number | null;
  commission?: number | null;
  exchange_rate?: number | null;
  additional_info?: string | null;
  address?: string | null;
  city_province?: string | null;
  country?: string | null;
  reference_number?: string | null;
  source_file?: string | null;
  created_at?: string;
  updated_at?: string;
  
  // Joined relation metadata (optional)
  account?: Account;
}

export type BillType = 'rent' | 'credit_card' | 'utility' | 'subscription' | 'other';
export type BillFrequency = 'monthly' | 'weekly' | 'biweekly';

export interface Bill {
  id: string;
  name: string;
  type: BillType;
  amount: number;
  due_day: number; // 1-31
  frequency: BillFrequency;
  linked_account_id?: string | null;
  autopay: boolean;
  next_due_date: string; // YYYY-MM-DD
  is_paid: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;

  linked_account?: Account;
}

export interface CreditReport {
  id: string;
  bureau: 'Equifax' | 'TransUnion' | 'Borrowell';
  file_url: string;
  file_name: string;
  score: number; // 300 - 900
  utilization_percent: number;
  total_debt: number;
  open_accounts: any[];
  closed_accounts: any[];
  inquiries: any[];
  derogatories: any[];
  extracted_text?: string | null;
  extracted_json?: any | null;
  uploaded_at: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  function_calls?: any | null;
  created_at?: string;
}

export type TransactionSortField =
  | 'date'
  | 'amount'
  | 'merchant'
  | 'category'
  | 'classification'
  | 'type'
  | 'node'
  | 'source_node';

export interface TransactionFilterParams {
  search?: string;
  account_ids?: string[];
  banks?: string[];
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  categories?: string[];
  type?: string;
  types?: string[];
  status?: TransactionStatus | 'all';
  source_file?: string;
  needs_review?: boolean;
  page?: number;
  limit?: number;
  sort_by?: TransactionSortField;
  sort_order?: 'asc' | 'desc';
}

export interface TransactionFilterResult {
  transactions: Transaction[];
  total: number;
  totalInflow?: number;
  totalOutflow?: number;
  netCashFlow?: number;
  page: number;
  limit: number;
  totalPages: number;
  accountSummary: Record<string, number>;
}

export interface SpendingSummary {
  period: string;
  totalSpent: number;
  totalIncome: number;
  netSavings: number;
  categoryBreakdown: Record<string, number>;
  merchantBreakdown: Record<string, number>;
  accountBreakdown: Record<string, number>;
}
