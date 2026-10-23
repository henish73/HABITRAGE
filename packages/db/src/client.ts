import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import {
  Account,
  Transaction,
  Bill,
  CreditReport,
  AiChatMessage,
  TransactionFilterParams,
  TransactionFilterResult,
  CategoryItem,
  recalculateRunningBalances,
  formatCAD,
  needsReview,
} from '@financeos/shared';

dotenv.config();

/**
 * Location of the JSON ledger. FINANCEOS_DATA_FILE wins (use it in containers,
 * pointed at a mounted volume). Otherwise the first existing file in the usual
 * monorepo locations, falling back to ./data/seed_cache.json.
 */
function getCachePath(): string {
  if (process.env.FINANCEOS_DATA_FILE) return path.resolve(process.env.FINANCEOS_DATA_FILE);
  const candidates = [
    path.resolve(process.cwd(), 'data/seed_cache.json'),
    path.resolve(process.cwd(), '../../data/seed_cache.json'),
    path.resolve(process.cwd(), '../data/seed_cache.json'),
    path.resolve(__dirname, '../../../data/seed_cache.json'),
    path.resolve(__dirname, '../../data/seed_cache.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

// Global Prisma instance singleton
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

let isPostgresAvailable: boolean | null = null;

export async function checkPostgres(): Promise<boolean> {
  if (isPostgresAvailable !== null) return isPostgresAvailable;
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('your-supabase')) {
    isPostgresAvailable = false;
    return false;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    isPostgresAvailable = true;
    return true;
  } catch {
    isPostgresAvailable = false;
    return false;
  }
}

// In-memory / file cache store fallback
interface CacheStore {
  accounts: Account[];
  transactions: Transaction[];
  categories?: CategoryItem[];
  bills: Bill[];
  creditReports: CreditReport[];
  aiChatHistory: AiChatMessage[];
  stats: any;
  trash?: TrashedTransaction[];
}

export interface TrashedTransaction {
  transaction: Transaction;
  deletedAt: string;
}

export const TRASH_RETENTION_DAYS = 30;

function moveToTrash(store: CacheStore, txs: Transaction[]) {
  if (txs.length === 0) return;
  const now = Date.now();
  const cutoff = now - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const kept = (store.trash || []).filter(
    (t) => new Date(t.deletedAt).getTime() >= cutoff && !txs.some((x) => x.id === t.transaction.id)
  );
  const deletedAt = new Date(now).toISOString();
  for (const tx of txs) {
    const { account, ...plain } = tx as Transaction & { account?: unknown };
    kept.push({ transaction: plain as Transaction, deletedAt });
  }
  store.trash = kept;
}

let memoryStore: CacheStore | null = null;
let lastCacheMtime = 0;

function loadMemoryStore(): CacheStore {
  const cachePath = getCachePath();
  if (fs.existsSync(cachePath)) {
    try {
      const stat = fs.statSync(cachePath);
      if (memoryStore && stat.mtimeMs <= lastCacheMtime) {
        return memoryStore;
      }
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      backfillOpeningBalances(data);
      memoryStore = data;
      lastCacheMtime = stat.mtimeMs;
      return memoryStore!;
    } catch (e) {
      console.error('Error loading seed cache from', cachePath, e);
    }
  }
  if (!memoryStore) {
    memoryStore = {
      accounts: [],
      transactions: [],
      bills: [],
      creditReports: [],
      aiChatHistory: [],
      stats: {},
    };
  }
  return memoryStore;
}

/**
 * Accounts seeded from statements carry a balance that doesn't start at $0.
 * Derive opening_balance so that recalculating from the ledger reproduces the
 * stored balance instead of jumping on the first edit.
 */
function backfillOpeningBalances(store: CacheStore) {
  for (const acc of store.accounts || []) {
    if (acc.opening_balance !== undefined && acc.opening_balance !== null) continue;
    const sign = acc.type === 'credit_card' ? -1 : 1;
    let delta = 0;
    for (const t of store.transactions || []) {
      if (t.account_id === acc.id && t.status === 'posted') delta += sign * t.amount;
    }
    acc.opening_balance = Math.round(((acc.balance || 0) - delta) * 100) / 100;
  }
}

function saveMemoryStore() {
  if (!memoryStore) return;
  const cachePath = getCachePath();
  try {
    // Write to a temp file and rename, so a crash mid-write can't corrupt the ledger.
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    const tmpPath = `${cachePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(memoryStore, null, 2), 'utf-8');
    fs.renameSync(tmpPath, cachePath);
    const stat = fs.statSync(cachePath);
    lastCacheMtime = stat.mtimeMs;
  } catch (e) {
    console.error('Error writing seed cache to', cachePath, e);
  }
}

function getNextDueDate(dueDay: number): string {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();
  if (now.getDate() > dueDay) {
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  const maxDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const day = Math.min(dueDay, maxDay);
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function advanceDueDate(currentDateStr: string, frequency: string = 'monthly', targetDueDay?: number): string {
  const [y, m, d] = currentDateStr.split('-').map(Number);
  if (frequency === 'weekly') {
    const date = new Date(Date.UTC(y, m - 1, d + 7));
    return date.toISOString().split('T')[0];
  }
  if (frequency === 'biweekly') {
    const date = new Date(Date.UTC(y, m - 1, d + 14));
    return date.toISOString().split('T')[0];
  }
  // monthly (or default)
  let nextYear = y;
  let nextMonth = m + 1; // 1-based next month
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  const targetDay = targetDueDay || d;
  const daysInNextMonth = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  const clampedDay = Math.min(targetDay, daysInNextMonth);
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

// ==========================================
// DATA ACCESS LAYER
// ==========================================

export const db = {
  // ACCOUNTS
  async getAccounts(): Promise<Account[]> {
    const store = loadMemoryStore();
    return store.accounts;
  },

  async getAccountById(id: string): Promise<Account | null> {
    const store = loadMemoryStore();
    return store.accounts.find(a => a.id === id) || null;
  },

  async createAccount(data: Omit<Account, 'id'>): Promise<Account> {
    const store = loadMemoryStore();
    const newAccount: Account = {
      ...data,
      // The balance a new account starts with is its opening balance; later transactions add to it.
      opening_balance: data.opening_balance ?? data.balance ?? 0,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.accounts.push(newAccount);
    saveMemoryStore();
    return newAccount;
  },

  async updateAccount(id: string, data: Partial<Account>): Promise<Account | null> {
    const store = loadMemoryStore();
    const idx = store.accounts.findIndex(a => a.id === id);
    if (idx === -1) return null;
    store.accounts[idx] = {
      ...store.accounts[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    saveMemoryStore();
    return store.accounts[idx];
  },

  async deleteAccount(id: string): Promise<boolean> {
    const store = loadMemoryStore();
    const initialLen = store.accounts.length;
    store.accounts = store.accounts.filter(a => a.id !== id);
    store.transactions = store.transactions.filter(t => t.account_id !== id);
    if (store.bills) {
      for (const b of store.bills) {
        if (b.linked_account_id === id) {
          b.linked_account_id = null;
        }
      }
    }
    saveMemoryStore();
    return store.accounts.length < initialLen;
  },

  // TRANSACTIONS
  async getTransactions(params: TransactionFilterParams = {}): Promise<TransactionFilterResult> {
    const store = loadMemoryStore();
    let txs = [...store.transactions];

    // Filter by search
    if (params.search && params.search.trim().length > 0) {
      const q = params.search.trim().toLowerCase();
      if (q.startsWith('category:') || q.startsWith('cat:')) {
        const catQuery = (q.startsWith('category:') ? q.slice(9) : q.slice(4)).trim();
        txs = txs.filter(t => t.category && t.category.toLowerCase().includes(catQuery));
      } else if (q.startsWith('type:')) {
        const typeQuery = q.slice(5).trim();
        txs = txs.filter(t => t.type && t.type.toLowerCase().includes(typeQuery));
      } else {
        txs = txs.filter(
          t =>
            t.description.toLowerCase().includes(q) ||
            t.merchant.toLowerCase().includes(q) ||
            (t.reference_number && t.reference_number.toLowerCase().includes(q)) ||
            (t.category && t.category.toLowerCase().includes(q)) ||
            (t.type && t.type.toLowerCase().includes(q))
        );
      }
    }

    // Filter by account_ids
    if (params.account_ids && params.account_ids.length > 0) {
      const accSet = new Set(params.account_ids);
      txs = txs.filter(t => accSet.has(t.account_id));
    }

    // Filter by banks
    if (params.banks && params.banks.length > 0) {
      const bankSet = new Set(params.banks.map(b => b.toLowerCase()));
      const accMap = new Map(store.accounts.map(a => [a.id, a.bank_name.toLowerCase()]));
      txs = txs.filter(t => {
        const b = accMap.get(t.account_id);
        return b && bankSet.has(b);
      });
    }

    // Filter by date range
    if (params.date_from) {
      txs = txs.filter(t => t.date >= params.date_from!);
    }
    if (params.date_to) {
      txs = txs.filter(t => t.date <= params.date_to!);
    }

    // Filter by amount range
    if (params.amount_min !== undefined) {
      txs = txs.filter(t => Math.abs(t.amount) >= params.amount_min!);
    }
    if (params.amount_max !== undefined) {
      txs = txs.filter(t => Math.abs(t.amount) <= params.amount_max!);
    }

    // Filter by categories (exact or multiple)
    if (params.categories && params.categories.length > 0) {
      const catSet = new Set(params.categories.map(c => c.toLowerCase()));
      txs = txs.filter(t => {
        if (!t.category) return false;
        const attached = t.category.split(',').map(c => c.trim().toLowerCase());
        return attached.some(c => catSet.has(c));
      });
    }

    // Filter by type (Inflow, Outflow, Transfers)
    if (params.type && params.type !== 'all') {
      const target = params.type.toLowerCase();
      if (target === 'inflow' || target === 'income') {
        txs = txs.filter(t => {
          if (t.type) return t.type.toLowerCase() === 'inflow';
          return t.amount > 0 && t.category !== 'Transfers';
        });
      } else if (target === 'outflow' || target === 'expense') {
        txs = txs.filter(t => {
          if (t.type) return t.type.toLowerCase() === 'outflow';
          return t.amount < 0 && t.category !== 'Transfers';
        });
      } else if (target.includes('transfer')) {
        txs = txs.filter(t => {
          if (t.type) return t.type.toLowerCase().includes('transfer');
          return t.category === 'Transfers';
        });
      } else {
        txs = txs.filter(t => t.type && t.type.toLowerCase() === target);
      }
    }
    if (params.types && params.types.length > 0) {
      const typeSet = new Set(params.types.map(t => t.toLowerCase()));
      txs = txs.filter(t => t.type && typeSet.has(t.type.toLowerCase()));
    }

    // Filter by status
    if (params.status && params.status !== 'all') {
      txs = txs.filter(t => t.status === params.status);
    }

    // Filter by source file
    if (params.source_file) {
      txs = txs.filter(t => t.source_file === params.source_file);
    }

    // "To review" queue (shared rule with the web UI)
    if (params.needs_review) {
      txs = txs.filter(t => needsReview(t));
    }

    // Populate account metadata map for sorting
    const accMap = new Map(store.accounts.map(a => [a.id, a]));

    // Sorting across all ledger columns
    const sortField = params.sort_by || 'date';
    const sortOrder = params.sort_order || 'desc';

    txs.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = a.date.localeCompare(b.date);
        if (cmp === 0) cmp = a.amount - b.amount;
      } else if (sortField === 'amount') {
        cmp = a.amount - b.amount;
      } else if (sortField === 'merchant') {
        const mA = a.merchant || a.description || '';
        const mB = b.merchant || b.description || '';
        cmp = mA.localeCompare(mB);
      } else if (sortField === 'category' || sortField === 'classification') {
        cmp = (a.category || '').localeCompare(b.category || '');
      } else if (sortField === 'type') {
        cmp = (a.type || '').localeCompare(b.type || '');
      } else if (sortField === 'node' || sortField === 'source_node') {
        const accA = accMap.get(a.account_id);
        const accB = accMap.get(b.account_id);
        const nA = `${accA?.bank_name || ''} ${accA?.account_name || ''}`.trim();
        const nB = `${accB?.bank_name || ''} ${accB?.account_name || ''}`.trim();
        cmp = nA.localeCompare(nB);
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    const total = txs.length;
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(params.limit || 50, 50000));
    const totalPages = Math.ceil(total / limit) || 1;

    const paginated = txs.slice((page - 1) * limit, page * limit).map(t => ({
      ...t,
      categories: t.category ? t.category.split(',').map(s => s.trim()).filter(Boolean) : [],
      account: accMap.get(t.account_id),
    }));

    // Account summary for current filtered set
    const accountSummary: Record<string, number> = {};
    for (const t of txs) {
      accountSummary[t.account_id] = (accountSummary[t.account_id] || 0) + 1;
    }

    // Summary metrics for filtered set (excluding transfers)
    let totalInflow = 0;
    let totalOutflow = 0;
    for (const t of txs) {
      const isTransfer = (t.type && t.type.toLowerCase() === 'transfers') || t.category === 'Transfers';
      if (isTransfer) continue;
      if (t.type ? t.type.toLowerCase() === 'inflow' : t.amount > 0) {
        if (t.amount > 0) totalInflow += t.amount;
      } else if (t.type ? t.type.toLowerCase() === 'outflow' : t.amount < 0) {
        totalOutflow += Math.abs(t.amount);
      }
    }

    return {
      transactions: paginated,
      total,
      totalInflow: Number(totalInflow.toFixed(2)),
      totalOutflow: Number(totalOutflow.toFixed(2)),
      netCashFlow: Number((totalInflow - totalOutflow).toFixed(2)),
      page,
      limit,
      totalPages,
      accountSummary,
    };
  },

  async getTransactionById(id: string): Promise<Transaction | null> {
    const store = loadMemoryStore();
    const tx = store.transactions.find(t => t.id === id);
    if (!tx) return null;
    const account = store.accounts.find(a => a.id === tx.account_id);
    return { ...tx, account };
  },

  async createTransaction(data: Omit<Transaction, 'id'>): Promise<Transaction> {
    const store = loadMemoryStore();
    let txType = data.type;
    if (!txType) {
      if (data.category === 'Transfers' || data.description?.toLowerCase().includes('transfer')) {
        txType = 'Transfers';
      } else if (data.amount > 0) {
        txType = 'Inflow';
      } else {
        txType = 'Outflow';
      }
    }
    const newTx: Transaction = {
      ...data,
      type: txType,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.transactions.unshift(newTx);

    // If posted, recalculate running balances for this account
    if (newTx.status === 'posted') {
      this.recalculateAccountBalances(newTx.account_id);
    }

    saveMemoryStore();

    // Persist to Postgres if available
    const isPg = await checkPostgres();
    if (isPg) {
      try {
        await prisma.transaction.create({
          data: {
            id: newTx.id,
            account_id: newTx.account_id,
            date: newTx.date,
            description: newTx.description || '',
            merchant: newTx.merchant || '',
            category: newTx.category || 'General',
            type: newTx.type || 'Outflow',
            amount: newTx.amount,
            debit: newTx.debit ?? (newTx.amount < 0 ? Math.abs(newTx.amount) : null),
            credit: newTx.credit ?? (newTx.amount > 0 ? newTx.amount : null),
            running_balance: newTx.running_balance ?? null,
            status: newTx.status || 'posted',
            reference_number: newTx.reference_number ?? null,
            source_file: newTx.source_file ?? null,
          },
        });
      } catch (err) {
        console.error('Error creating transaction in Postgres:', err);
      }
    }

    return newTx;
  },

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction | null> {
    const store = loadMemoryStore();
    const idx = store.transactions.findIndex(t => t.id === id);
    if (idx === -1) return null;

    const oldTx = store.transactions[idx];
    let category = oldTx.category;
    if (data.categories && Array.isArray(data.categories)) {
      category = data.categories.join(', ');
    } else if (data.category !== undefined) {
      category = data.category;
    }
    const categories = category ? category.split(',').map(s => s.trim()).filter(Boolean) : [];

    const updated = {
      ...oldTx,
      ...data,
      id,
      category,
      categories,
      updated_at: new Date().toISOString(),
    };
    store.transactions[idx] = updated;

    // Recalculate if amount, status, date, or account_id changed
    if (
      data.amount !== undefined ||
      data.status !== undefined ||
      data.date !== undefined ||
      data.account_id !== undefined
    ) {
      this.recalculateAccountBalances(updated.account_id);
      if (oldTx.account_id !== updated.account_id) {
        this.recalculateAccountBalances(oldTx.account_id);
      }
    }

    saveMemoryStore();

    // Persist to Postgres if available
    const isPg = await checkPostgres();
    if (isPg) {
      try {
        const updatePayload: any = {};
        if (data.amount !== undefined) {
          updatePayload.amount = data.amount;
          updatePayload.debit = data.amount < 0 ? Math.abs(data.amount) : null;
          updatePayload.credit = data.amount > 0 ? data.amount : null;
        }
        if (data.date !== undefined) updatePayload.date = data.date;
        if (data.description !== undefined) updatePayload.description = data.description;
        if (data.merchant !== undefined) updatePayload.merchant = data.merchant;
        if (category !== undefined) updatePayload.category = category;
        if (data.type !== undefined) updatePayload.type = data.type;
        if (data.status !== undefined) updatePayload.status = data.status;
        if (data.account_id !== undefined) updatePayload.account_id = data.account_id;
        if (data.reference_number !== undefined) updatePayload.reference_number = data.reference_number;
        if (updated.running_balance !== undefined) updatePayload.running_balance = updated.running_balance;

        await prisma.transaction.update({
          where: { id },
          data: updatePayload,
        });
      } catch (err) {
        console.error('Error updating transaction in Postgres:', err);
      }
    }

    return updated;
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const store = loadMemoryStore();
    const tx = store.transactions.find(t => t.id === id);
    if (!tx) {
      const isPg = await checkPostgres();
      if (isPg) {
        try {
          const res = await prisma.transaction.deleteMany({ where: { id } });
          if (res.count > 0) return true;
        } catch {}
      }
      return false;
    }

    store.transactions = store.transactions.filter(t => t.id !== id);
    moveToTrash(store, [tx]);
    if (tx.status === 'posted') {
      this.recalculateAccountBalances(tx.account_id);
    }

    saveMemoryStore();

    const isPg = await checkPostgres();
    if (isPg) {
      try {
        await prisma.transaction.delete({
          where: { id },
        });
      } catch (err) {
        console.error('Error deleting transaction in Postgres:', err);
      }
    }

    return true;
  },

  /** Deleted transactions still inside the retention window, newest first. */
  async getTrash(): Promise<TrashedTransaction[]> {
    const store = loadMemoryStore();
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return (store.trash || [])
      .filter((t) => new Date(t.deletedAt).getTime() >= cutoff)
      .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  },

  /**
   * Puts trashed transactions back exactly as they were (same id, account and
   * fields) and recalculates the affected balances. Returns those restored.
   */
  async restoreTransactions(ids: string[]): Promise<Transaction[]> {
    const store = loadMemoryStore();
    const wanted = new Set(ids);
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const restored: Transaction[] = [];
    const remaining: TrashedTransaction[] = [];
    for (const item of store.trash || []) {
      const live = new Date(item.deletedAt).getTime() >= cutoff;
      if (live && wanted.has(item.transaction.id) && store.accounts.some(a => a.id === item.transaction.account_id)) {
        if (!store.transactions.some(t => t.id === item.transaction.id)) {
          store.transactions.unshift(item.transaction);
          restored.push(item.transaction);
        }
      } else if (live) {
        remaining.push(item);
      }
    }
    if (restored.length === 0) return [];
    store.trash = remaining;
    for (const accountId of new Set(restored.map(t => t.account_id))) {
      this.recalculateAccountBalances(accountId);
    }
    saveMemoryStore();

    const isPg = await checkPostgres();
    if (isPg) {
      for (const tx of restored) {
        try {
          await prisma.transaction.create({
            data: {
              id: tx.id,
              account_id: tx.account_id,
              date: tx.date,
              description: tx.description || '',
              merchant: tx.merchant || '',
              category: tx.category || 'General',
              type: tx.type || 'Outflow',
              amount: tx.amount,
              debit: tx.debit ?? null,
              credit: tx.credit ?? null,
              running_balance: tx.running_balance ?? null,
              status: tx.status || 'posted',
              reference_number: tx.reference_number ?? null,
              source_file: tx.source_file ?? null,
            },
          });
        } catch (err) {
          console.error('Error restoring transaction in Postgres:', err);
        }
      }
    }
    return restored;
  },

  async bulkUpdateTransactions(
    ids: string[],
    data: {
      category?: string;
      categories?: string[];
      status?: 'posted' | 'pending';
      mode?: 'replace' | 'append';
      type?: 'Inflow' | 'Outflow' | 'Transfers';
    }
  ): Promise<number> {
    const store = loadMemoryStore();
    let count = 0;
    const affectedAccounts = new Set<string>();

    const targetCategory = data.categories && data.categories.length > 0
      ? data.categories.join(', ')
      : data.category;

    const mode = data.mode || 'replace';

    for (const id of ids) {
      const idx = store.transactions.findIndex(t => t.id === id);
      if (idx !== -1) {
        if (targetCategory) {
          if (mode === 'append' && store.transactions[idx].category) {
            const existing = store.transactions[idx].category
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
            const toAdd = targetCategory
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
            const merged = Array.from(new Set([...existing, ...toAdd]));
            store.transactions[idx].category = merged.join(', ');
            store.transactions[idx].categories = merged;
          } else {
            store.transactions[idx].category = targetCategory;
            store.transactions[idx].categories = targetCategory
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
          }
        }
        if (data.status) {
          store.transactions[idx].status = data.status;
          affectedAccounts.add(store.transactions[idx].account_id);
        }
        if (data.type) {
          const oldAmount = store.transactions[idx].amount;
          store.transactions[idx].type = data.type;
          if (data.type === 'Inflow') {
            if (oldAmount < 0) {
              store.transactions[idx].amount = Math.abs(oldAmount);
              store.transactions[idx].credit = Math.abs(oldAmount);
              store.transactions[idx].debit = null;
              affectedAccounts.add(store.transactions[idx].account_id);
            }
          } else if (data.type === 'Outflow') {
            if (oldAmount > 0) {
              store.transactions[idx].amount = -Math.abs(oldAmount);
              store.transactions[idx].debit = Math.abs(oldAmount);
              store.transactions[idx].credit = null;
              affectedAccounts.add(store.transactions[idx].account_id);
            }
          }
        }
        store.transactions[idx].updated_at = new Date().toISOString();
        count++;
      }
    }

    for (const accId of affectedAccounts) {
      this.recalculateAccountBalances(accId);
    }

    saveMemoryStore();

    const isPg = await checkPostgres();
    if (isPg) {
      try {
        if (mode === 'append' || data.type) {
          for (const id of ids) {
            const tx = store.transactions.find(t => t.id === id);
            if (tx) {
              await prisma.transaction.update({
                where: { id },
                data: {
                  category: tx.category,
                  type: tx.type,
                  amount: tx.amount,
                  debit: tx.debit,
                  credit: tx.credit,
                  running_balance: tx.running_balance,
                  ...(data.status ? { status: data.status } : {}),
                },
              });
            }
          }
        } else {
          const updateData: any = {};
          if (targetCategory) updateData.category = targetCategory;
          if (data.status) updateData.status = data.status;
          await prisma.transaction.updateMany({
            where: { id: { in: ids } },
            data: updateData,
          });
        }
      } catch (err) {
        console.error('Error bulk updating transactions in Postgres:', err);
      }
    }

    return count;
  },

  async bulkDeleteTransactions(ids: string[]): Promise<number> {
    const store = loadMemoryStore();
    const idSet = new Set(ids);
    const affectedAccounts = new Set<string>();

    store.transactions.forEach(t => {
      if (idSet.has(t.id) && t.status === 'posted') {
        affectedAccounts.add(t.account_id);
      }
    });

    const initialLen = store.transactions.length;
    moveToTrash(store, store.transactions.filter(t => idSet.has(t.id)));
    store.transactions = store.transactions.filter(t => !idSet.has(t.id));
    const deletedCount = initialLen - store.transactions.length;

    for (const accId of affectedAccounts) {
      this.recalculateAccountBalances(accId);
    }

    saveMemoryStore();

    const isPg = await checkPostgres();
    if (isPg) {
      try {
        await prisma.transaction.deleteMany({
          where: { id: { in: ids } },
        });
      } catch (err) {
        console.error('Error bulk deleting transactions in Postgres:', err);
      }
    }

    return deletedCount;
  },

  recalculateAccountBalances(accountId: string) {
    const store = loadMemoryStore();
    const acc = store.accounts.find(a => a.id === accountId);
    if (!acc) return;

    // Get all transactions for this account
    const accTxs = store.transactions.filter(t => t.account_id === accountId);

    // Sort ascending by date, keeping created_at order for same-day
    const sorted = [...accTxs].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      if (a.created_at && b.created_at) {
        return a.created_at.localeCompare(b.created_at);
      }
      return 0;
    });

    const isCard = acc.type === 'credit_card';
    const startingBalance = acc.opening_balance ?? 0;
    let currentBalance = startingBalance;

    const updated: Transaction[] = [];
    for (const tx of sorted) {
      if (tx.status === 'posted') {
        if (isCard) {
          // Negative amount (expense) increases debt, positive decreases debt
          currentBalance = Math.round((currentBalance - tx.amount) * 100) / 100;
        } else {
          // Positive amount increases balance, negative decreases balance
          currentBalance = Math.round((currentBalance + tx.amount) * 100) / 100;
        }
        updated.push({
          ...tx,
          running_balance: currentBalance,
        });
      } else {
        updated.push({
          ...tx,
          running_balance: null,
        });
      }
    }

    // Update transactions in store with recalculated running balance
    const updatedMap = new Map(updated.map(t => [t.id, t]));
    store.transactions = store.transactions.map(t => updatedMap.get(t.id) || t);

    // Set latest account balance from posted transactions
    const postedTxs = updated.filter(t => t.status === 'posted');
    if (postedTxs.length > 0) {
      const latest = postedTxs[postedTxs.length - 1];
      if (latest.running_balance !== null && latest.running_balance !== undefined) {
        acc.balance = latest.running_balance;
      }
    } else {
      acc.balance = startingBalance;
    }
  },

  // BILLS
  async getBills(): Promise<Bill[]> {
    const store = loadMemoryStore();
    const accMap = new Map(store.accounts.map(a => [a.id, a]));
    const existingBills = [...store.bills];
    const existingLinkedCardIds = new Set(existingBills.filter(b => b.linked_account_id).map(b => b.linked_account_id));

    const dismissed = new Set(store.stats?.dismissedBills || []);

    // Automatically generate due date reminders for credit cards if not already present
    for (const acc of store.accounts) {
      const autoId = `cc-auto-${acc.id}`;
      if (dismissed.has(autoId)) continue;
      if (acc.type === 'credit_card' && !existingLinkedCardIds.has(acc.id) && acc.balance > 0) {
        const autoDueDay = acc.bank_name.toLowerCase().includes('cibc') ? 21 : acc.bank_name.toLowerCase().includes('td') ? 27 : 18;
        const autoDueDate = acc.due_date || getNextDueDate(autoDueDay);
        const minPay = acc.minimum_payment || Math.max(10, Math.min(Number(acc.balance), Math.round(Number(acc.balance) * 0.03 * 100) / 100));

        existingBills.push({
          id: `cc-auto-${acc.id}`,
          name: `${acc.account_name} Payment`,
          type: 'credit_card',
          amount: minPay,
          due_day: autoDueDay,
          frequency: 'monthly',
          linked_account_id: acc.id,
          autopay: false,
          next_due_date: autoDueDate,
          is_paid: false,
          notes: `Auto-calculated minimum payment based on current balance of ${formatCAD(acc.balance)}. Statement cycle +21 days.`,
          created_at: new Date().toISOString(),
        });
      }
    }

    return existingBills.map(b => ({
      ...b,
      linked_account: b.linked_account_id ? accMap.get(b.linked_account_id) : undefined,
    }));
  },

  async createBill(data: Omit<Bill, 'id'>): Promise<Bill> {
    const store = loadMemoryStore();
    const newBill: Bill = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.bills.push(newBill);
    saveMemoryStore();
    return newBill;
  },

  async updateBill(id: string, data: Partial<Bill>): Promise<Bill | null> {
    const store = loadMemoryStore();
    const idx = store.bills.findIndex(b => b.id === id);
    if (idx === -1) return null;
    store.bills[idx] = {
      ...store.bills[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    saveMemoryStore();
    return store.bills[idx];
  },

  async deleteBill(id: string): Promise<boolean> {
    const store = loadMemoryStore();
    if (id.startsWith('cc-auto-')) {
      store.stats = store.stats || {};
      store.stats.dismissedBills = store.stats.dismissedBills || [];
      if (!store.stats.dismissedBills.includes(id)) {
        store.stats.dismissedBills.push(id);
      }
      saveMemoryStore();
      return true;
    }
    const initialLen = store.bills.length;
    store.bills = store.bills.filter(b => b.id !== id);
    saveMemoryStore();
    return store.bills.length < initialLen;
  },

  async markBillPaid(id: string, createTx = false): Promise<Bill | null> {
    const store = loadMemoryStore();
    let bill = store.bills.find(b => b.id === id);

    // Support paying auto-generated credit-card bills
    if (!bill && id.startsWith('cc-auto-')) {
      const accId = id.replace('cc-auto-', '');
      const acc = store.accounts.find(a => a.id === accId);
      if (acc) {
        const autoDueDay = acc.bank_name.toLowerCase().includes('cibc') ? 21 : acc.bank_name.toLowerCase().includes('td') ? 27 : 18;
        const autoDueDate = acc.due_date || getNextDueDate(autoDueDay);
        const minPay = acc.minimum_payment || Math.max(10, Math.min(Number(acc.balance), Math.round(Number(acc.balance) * 0.03 * 100) / 100));
        bill = {
          id,
          name: `${acc.account_name} Payment`,
          type: 'credit_card',
          amount: minPay,
          due_day: autoDueDay,
          frequency: 'monthly',
          linked_account_id: acc.id,
          autopay: false,
          next_due_date: autoDueDate,
          is_paid: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        store.bills.push(bill);
      }
    }

    if (!bill) return null;

    bill.next_due_date = advanceDueDate(bill.next_due_date, bill.frequency, bill.due_day);
    bill.is_paid = false;
    bill.updated_at = new Date().toISOString();

    if (createTx && bill.linked_account_id) {
      await this.createTransaction({
        account_id: bill.linked_account_id,
        date: new Date().toISOString().split('T')[0],
        description: `Bill Payment: ${bill.name}`,
        merchant: bill.name,
        category: bill.type === 'rent' ? 'Rent & Housing' : bill.type === 'utility' ? 'Utilities & Phone' : 'General',
        amount: -bill.amount,
        debit: bill.amount,
        credit: null,
        status: 'posted',
        source_file: 'manual_bill_payment',
      });
    }

    saveMemoryStore();
    return bill;
  },

  // CREDIT REPORTS
  async getCreditReports(): Promise<CreditReport[]> {
    const store = loadMemoryStore();
    return store.creditReports;
  },

  async createCreditReport(data: Omit<CreditReport, 'id' | 'uploaded_at'>): Promise<CreditReport> {
    const store = loadMemoryStore();
    const newReport: CreditReport = {
      ...data,
      id: crypto.randomUUID(),
      uploaded_at: new Date().toISOString(),
    };
    store.creditReports.unshift(newReport);
    saveMemoryStore();
    return newReport;
  },

  // AI CHAT HISTORY
  async getAiChatHistory(): Promise<AiChatMessage[]> {
    const store = loadMemoryStore();
    return store.aiChatHistory;
  },

  async addAiChatMessage(role: 'user' | 'assistant', content: string, functionCalls?: any): Promise<AiChatMessage> {
    const store = loadMemoryStore();
    const msg: AiChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      function_calls: functionCalls || null,
      created_at: new Date().toISOString(),
    };
    store.aiChatHistory.push(msg);
    saveMemoryStore();
    return msg;
  },

  async clearAiChatHistory(): Promise<boolean> {
    const store = loadMemoryStore();
    store.aiChatHistory = [];
    saveMemoryStore();
    return true;
  },

  // CATEGORIES
  async getCategories(): Promise<CategoryItem[]> {
    const store = loadMemoryStore();
    const catMap = new Map<string, CategoryItem>();

    // 1. Categories from store.categories
    if (Array.isArray(store.categories)) {
      for (const c of store.categories) {
        catMap.set(c.name.toLowerCase(), c);
      }
    }

    // 2. Also ensure all distinct individual categories present in transactions are available
    for (const t of store.transactions) {
      if (!t.category) continue;
      const individual = t.category.split(',').map(s => s.trim()).filter(Boolean);
      for (const singleCat of individual) {
        if (!catMap.has(singleCat.toLowerCase())) {
          catMap.set(singleCat.toLowerCase(), {
            id: `cat-${singleCat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            name: singleCat,
            color: '#6366f1',
            icon: 'Tag',
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    return Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  },

  async createCategory(data: { name: string; color?: string | null; icon?: string | null }): Promise<CategoryItem> {
    const store = loadMemoryStore();
    const cleanName = data.name.trim();
    if (!store.categories) store.categories = [];
    const existing = store.categories.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      return existing;
    }

    const newCat: CategoryItem = {
      id: crypto.randomUUID(),
      name: cleanName,
      color: data.color || '#3b82f6',
      icon: data.icon || 'Tag',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.categories.push(newCat);
    saveMemoryStore();

    // If Postgres is connected, save there too
    const isPg = await checkPostgres();
    if (isPg) {
      try {
        await prisma.category.upsert({
          where: { name: newCat.name },
          create: {
            id: newCat.id,
            name: newCat.name,
            color: newCat.color,
            icon: newCat.icon,
          },
          update: {
            color: newCat.color,
            icon: newCat.icon,
          },
        });
      } catch (err) {
        console.error('Error inserting category to Postgres:', err);
      }
    }

    return newCat;
  },

  async deleteCategory(
    nameOrId: string,
    reassignTo?: string
  ): Promise<{ success: boolean; affectedCount: number }> {
    const store = loadMemoryStore();
    const catToDelete = (store.categories || []).find(
      c => c.id === nameOrId || c.name.toLowerCase() === nameOrId.toLowerCase()
    );
    const targetName = catToDelete ? catToDelete.name : nameOrId;
    const cleanReassign = reassignTo && reassignTo.trim() ? reassignTo.trim() : '';

    // Remove from store.categories
    if (store.categories) {
      store.categories = store.categories.filter(
        c => c.id !== nameOrId && c.name.toLowerCase() !== nameOrId.toLowerCase()
      );
    }

    // Ensure reassignTo category exists in store.categories if provided and not 'General'
    if (cleanReassign && cleanReassign !== 'General') {
      if (!store.categories) store.categories = [];
      const hasTarget = store.categories.some(c => c.name.toLowerCase() === cleanReassign.toLowerCase());
      if (!hasTarget) {
        store.categories.push({
          id: crypto.randomUUID(),
          name: cleanReassign,
          color: '#6366f1',
          icon: 'Tag',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Reassign all transactions having this category
    let affectedCount = 0;
    for (const t of store.transactions) {
      if (!t.category) continue;
      const cats = t.category.split(',').map(c => c.trim()).filter(Boolean);
      const idx = cats.findIndex(c => c.toLowerCase() === targetName.toLowerCase() || c.toLowerCase() === nameOrId.toLowerCase());
      if (idx !== -1) {
        affectedCount++;
        if (cleanReassign) {
          cats[idx] = cleanReassign;
        } else {
          cats.splice(idx, 1);
        }
        const unique = Array.from(new Set(cats));
        t.category = unique.length > 0 ? unique.join(', ') : 'General';
        t.categories = unique.length > 0 ? unique : ['General'];
      }
    }

    saveMemoryStore();

    const isPg = await checkPostgres();
    if (isPg) {
      try {
        await prisma.category.deleteMany({
          where: {
            OR: [
              { id: nameOrId },
              { name: { equals: targetName, mode: 'insensitive' } },
            ],
          },
        });
        if (cleanReassign) {
          await prisma.transaction.updateMany({
            where: {
              category: { equals: targetName, mode: 'insensitive' },
            },
            data: {
              category: cleanReassign,
            },
          });
        }
      } catch (err) {
        console.error('Error updating category in Postgres:', err);
      }
    }

    return { success: true, affectedCount };
  },

  async getCategoryUsageCount(nameOrId: string): Promise<number> {
    const store = loadMemoryStore();
    const clean = nameOrId.toLowerCase();
    let count = 0;
    for (const t of store.transactions) {
      if (!t.category) continue;
      const cats = t.category.split(',').map(c => c.trim().toLowerCase());
      if (cats.includes(clean)) count++;
    }
    return count;
  },
};
