import crypto from 'crypto';
import dotenv from 'dotenv';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  Account,
  Transaction,
  Bill,
  CreditReport,
  AiChatMessage,
  TransactionFilterParams,
  TransactionFilterResult,
  CategoryItem,
  formatCAD,
} from '@financeos/shared';

dotenv.config();

// ==========================================
// PRISMA CLIENT SINGLETON & OWNER SCOPING
// ==========================================

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export function getOwnerId(): string {
  return process.env.OWNER_ID || 'owner';
}

export const TRASH_RETENTION_DAYS = 30;

export interface TrashedTransaction {
  transaction: Transaction;
  deletedAt: string;
}

// ==========================================
// TYPE CONVERTERS (DB Decimal -> Plain Number)
// ==========================================

function num(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === 'number' ? d : d.toNumber();
}

function numOrNull(d: Prisma.Decimal | number | null | undefined): number | null {
  if (d === null || d === undefined) return null;
  return typeof d === 'number' ? d : d.toNumber();
}

function numOrUndef(d: Prisma.Decimal | number | null | undefined): number | undefined {
  if (d === null || d === undefined) return undefined;
  return typeof d === 'number' ? d : d.toNumber();
}

function mapAccount(a: any): Account {
  return {
    id: a.id,
    type: a.type as 'bank' | 'credit_card',
    bank_name: a.bank_name,
    account_name: a.account_name,
    account_number: a.account_number,
    account_type: a.account_type,
    opening_balance: num(a.opening_balance),
    balance: num(a.balance),
    credit_limit: numOrUndef(a.credit_limit),
    apr: numOrUndef(a.apr),
    due_date: a.due_date ?? undefined,
    minimum_payment: numOrUndef(a.minimum_payment),
    statement_closing_date: a.statement_closing_date ?? undefined,
    notes: a.notes ?? undefined,
    archived: a.archived,
    created_at: a.created_at instanceof Date ? a.created_at.toISOString() : a.created_at,
    updated_at: a.updated_at instanceof Date ? a.updated_at.toISOString() : a.updated_at,
  };
}

function mapTransaction(t: any): Transaction {
  const cats = t.category ? t.category.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  return {
    id: t.id,
    account_id: t.account_id,
    account: t.account ? mapAccount(t.account) : undefined,
    date: t.date,
    description: t.description,
    merchant: t.merchant || '',
    category: t.category || 'General',
    categories: cats,
    type: t.type as 'Inflow' | 'Outflow' | 'Transfers' | undefined,
    amount: num(t.amount),
    debit: numOrNull(t.debit),
    credit: numOrNull(t.credit),
    running_balance: numOrNull(t.running_balance),
    status: (t.status || 'posted') as 'posted' | 'pending',
    cheque_number: t.cheque_number ?? undefined,
    foreign_spend_amount: numOrUndef(t.foreign_spend_amount),
    commission: numOrUndef(t.commission),
    exchange_rate: numOrUndef(t.exchange_rate),
    additional_info: t.additional_info ?? undefined,
    address: t.address ?? undefined,
    city_province: t.city_province ?? undefined,
    country: t.country ?? undefined,
    reference_number: t.reference_number ?? undefined,
    source_file: t.source_file ?? undefined,
    created_at: t.created_at instanceof Date ? t.created_at.toISOString() : t.created_at,
    updated_at: t.updated_at instanceof Date ? t.updated_at.toISOString() : t.updated_at,
  };
}

function mapBill(b: any): Bill {
  return {
    id: b.id,
    name: b.name,
    type: b.type,
    amount: num(b.amount),
    due_day: b.due_day,
    frequency: b.frequency,
    linked_account_id: b.linked_account_id,
    linked_account: b.linked_account ? mapAccount(b.linked_account) : undefined,
    autopay: b.autopay,
    next_due_date: b.next_due_date,
    is_paid: b.is_paid,
    notes: b.notes ?? undefined,
    created_at: b.created_at instanceof Date ? b.created_at.toISOString() : b.created_at,
    updated_at: b.updated_at instanceof Date ? b.updated_at.toISOString() : b.updated_at,
  };
}

function mapCreditReport(r: any): CreditReport {
  return {
    id: r.id,
    bureau: r.bureau,
    file_url: r.file_url,
    file_name: r.file_name,
    score: r.score,
    utilization_percent: num(r.utilization_percent),
    total_debt: num(r.total_debt),
    open_accounts: r.open_accounts as any,
    closed_accounts: r.closed_accounts as any,
    inquiries: r.inquiries as any,
    derogatories: r.derogatories as any,
    extracted_text: r.extracted_text ?? undefined,
    extracted_json: r.extracted_json ?? undefined,
    uploaded_at: r.uploaded_at instanceof Date ? r.uploaded_at.toISOString() : r.uploaded_at,
  };
}

function mapCategory(c: any): CategoryItem {
  return {
    id: c.id,
    name: c.name,
    color: c.color ?? '#6366f1',
    icon: c.icon ?? 'Tag',
    created_at: c.created_at instanceof Date ? c.created_at.toISOString() : c.created_at,
    updated_at: c.updated_at instanceof Date ? c.updated_at.toISOString() : c.updated_at,
  };
}

// ==========================================
// BILL DATE HELPERS
// ==========================================

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
// DATA ACCESS LAYER (PURE PRISMA)
// ==========================================

export const db = {
  // ACCOUNTS
  async getAccounts(): Promise<Account[]> {
    const owner_id = getOwnerId();
    const rows = await prisma.account.findMany({
      where: { owner_id },
      orderBy: { created_at: 'asc' },
    });
    return rows.map(mapAccount);
  },

  async getAccountById(id: string): Promise<Account | null> {
    const owner_id = getOwnerId();
    const row = await prisma.account.findFirst({
      where: { id, owner_id },
    });
    return row ? mapAccount(row) : null;
  },

  async createAccount(data: Omit<Account, 'id'>): Promise<Account> {
    const owner_id = getOwnerId();
    const startingBalance = data.opening_balance ?? data.balance ?? 0;
    const row = await prisma.account.create({
      data: {
        id: (data as any).id || crypto.randomUUID(),
        owner_id,
        type: data.type,
        bank_name: data.bank_name,
        account_name: data.account_name,
        account_number: data.account_number,
        account_type: data.account_type,
        opening_balance: startingBalance,
        balance: data.balance ?? startingBalance,
        credit_limit: data.credit_limit,
        apr: data.apr,
        due_date: data.due_date,
        minimum_payment: data.minimum_payment,
        statement_closing_date: data.statement_closing_date,
        notes: data.notes,
        archived: data.archived ?? false,
      },
    });
    return mapAccount(row);
  },

  async updateAccount(id: string, data: Partial<Account>): Promise<Account | null> {
    const owner_id = getOwnerId();
    const existing = await prisma.account.findFirst({
      where: { id, owner_id },
    });
    if (!existing) return null;

    const row = await prisma.account.update({
      where: { id },
      data: {
        type: data.type,
        bank_name: data.bank_name,
        account_name: data.account_name,
        account_number: data.account_number,
        account_type: data.account_type,
        opening_balance: data.opening_balance !== undefined ? (data.opening_balance ?? 0) : undefined,
        balance: data.balance !== undefined ? data.balance : undefined,
        credit_limit: data.credit_limit,
        apr: data.apr,
        due_date: data.due_date,
        minimum_payment: data.minimum_payment,
        statement_closing_date: data.statement_closing_date,
        notes: data.notes,
        archived: data.archived,
      },
    });
    return mapAccount(row);
  },

  async deleteAccount(id: string): Promise<boolean> {
    const owner_id = getOwnerId();
    const existing = await prisma.account.findFirst({
      where: { id, owner_id },
    });
    if (!existing) return false;

    await prisma.$transaction(async (tx) => {
      // Unlink bills
      await tx.bill.updateMany({
        where: { linked_account_id: id, owner_id },
        data: { linked_account_id: null },
      });
      // Delete account (transactions cascade)
      await tx.account.delete({
        where: { id },
      });
    });
    return true;
  },

  // TRANSACTIONS
  async getTransactions(params: TransactionFilterParams = {}): Promise<TransactionFilterResult> {
    const owner_id = getOwnerId();
    const andClauses: any[] = [];

    // Base scoping: active transactions for current owner
    const where: any = {
      owner_id,
      deleted_at: null,
    };

    // Filter by search
    if (params.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      const qLower = q.toLowerCase();
      if (qLower.startsWith('category:') || qLower.startsWith('cat:')) {
        const catQuery = (qLower.startsWith('category:') ? q.slice(9) : q.slice(4)).trim();
        andClauses.push({ category: { contains: catQuery, mode: 'insensitive' } });
      } else if (qLower.startsWith('type:')) {
        const typeQuery = q.slice(5).trim();
        andClauses.push({ type: { contains: typeQuery, mode: 'insensitive' } });
      } else {
        andClauses.push({
          OR: [
            { description: { contains: q, mode: 'insensitive' } },
            { merchant: { contains: q, mode: 'insensitive' } },
            { reference_number: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
            { type: { contains: q, mode: 'insensitive' } },
          ],
        });
      }
    }

    // Filter by account_ids
    if (params.account_ids && params.account_ids.length > 0) {
      where.account_id = { in: params.account_ids };
    }

    // Filter by banks
    if (params.banks && params.banks.length > 0) {
      andClauses.push({
        account: {
          bank_name: { in: params.banks, mode: 'insensitive' },
        },
      });
    }

    // Filter by date range (inclusive)
    if (params.date_from && params.date_to) {
      where.date = { gte: params.date_from, lte: params.date_to };
    } else if (params.date_from) {
      where.date = { gte: params.date_from };
    } else if (params.date_to) {
      where.date = { lte: params.date_to };
    }

    // Filter by amount range (by absolute value)
    if (params.amount_min !== undefined && params.amount_max !== undefined) {
      const min = params.amount_min;
      const max = params.amount_max;
      andClauses.push({
        OR: [
          { amount: { gte: min, lte: max } },
          { amount: { gte: -max, lte: -min } },
        ],
      });
    } else if (params.amount_min !== undefined) {
      const min = params.amount_min;
      andClauses.push({
        OR: [{ amount: { gte: min } }, { amount: { lte: -min } }],
      });
    } else if (params.amount_max !== undefined) {
      const max = params.amount_max;
      where.amount = { gte: -max, lte: max };
    }

    // Filter by categories (exact or multiple, comma-separated support)
    if (params.categories && params.categories.length > 0) {
      andClauses.push({
        OR: params.categories.map((c) => ({
          category: { contains: c, mode: 'insensitive' },
        })),
      });
    }

    // Filter by type (Inflow, Outflow, Transfers)
    if (params.type && params.type !== 'all') {
      const target = params.type.toLowerCase();
      if (target === 'inflow' || target === 'income') {
        andClauses.push({
          OR: [
            { type: { equals: 'Inflow', mode: 'insensitive' } },
            {
              AND: [
                { type: null },
                { amount: { gt: 0 } },
                { category: { not: 'Transfers' } },
              ],
            },
          ],
        });
      } else if (target === 'outflow' || target === 'expense') {
        andClauses.push({
          OR: [
            { type: { equals: 'Outflow', mode: 'insensitive' } },
            {
              AND: [
                { type: null },
                { amount: { lt: 0 } },
                { category: { not: 'Transfers' } },
              ],
            },
          ],
        });
      } else if (target.includes('transfer')) {
        andClauses.push({
          OR: [
            { type: { contains: 'transfer', mode: 'insensitive' } },
            { category: 'Transfers' },
          ],
        });
      } else {
        where.type = { equals: params.type, mode: 'insensitive' };
      }
    }

    if (params.types && params.types.length > 0) {
      where.type = { in: params.types, mode: 'insensitive' };
    }

    // Filter by status
    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }

    // Filter by source file
    if (params.source_file) {
      where.source_file = params.source_file;
    }

    // "To review" queue
    if (params.needs_review) {
      andClauses.push({
        OR: [
          { status: 'pending' },
          { category: '' },
          { category: { equals: 'general', mode: 'insensitive' } },
          { category: { contains: 'uncategorized', mode: 'insensitive' } },
          { category: { contains: 'misc', mode: 'insensitive' } },
          {
            AND: [
              { amount: { gt: 0 } },
              { category: { not: { contains: 'income' } } },
              { category: { not: { contains: 'Income' } } },
              { category: { not: { contains: 'transfer' } } },
              { category: { not: { contains: 'Transfer' } } },
            ],
          },
          { description: { contains: 'refund', mode: 'insensitive' } },
          { description: { contains: 'cash back', mode: 'insensitive' } },
        ],
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    // Sorting
    const sortField = params.sort_by || 'date';
    const sortOrder = (params.sort_order || 'desc') as Prisma.SortOrder;
    let orderBy: any;

    if (sortField === 'date') {
      orderBy = [{ date: sortOrder }, { amount: sortOrder }, { id: 'desc' }];
    } else if (sortField === 'amount') {
      orderBy = [{ amount: sortOrder }, { date: 'desc' }, { id: 'desc' }];
    } else if (sortField === 'merchant') {
      orderBy = [{ merchant: sortOrder }, { description: sortOrder }, { date: 'desc' }];
    } else if (sortField === 'category' || sortField === 'classification') {
      orderBy = [{ category: sortOrder }, { date: 'desc' }];
    } else if (sortField === 'type') {
      orderBy = [{ type: sortOrder }, { date: 'desc' }];
    } else if (sortField === 'node' || sortField === 'source_node') {
      orderBy = [
        { account: { bank_name: sortOrder } },
        { account: { account_name: sortOrder } },
        { date: 'desc' },
      ];
    } else {
      orderBy = [{ date: 'desc' }];
    }

    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(params.limit || 50, 50000));
    const skip = (page - 1) * limit;

    // Filter for totals excluding transfers
    const nonTransferWhere: any = {
      ...where,
      AND: [
        ...(where.AND || []),
        {
          NOT: {
            OR: [
              { type: { equals: 'transfers', mode: 'insensitive' } },
              { category: 'Transfers' },
            ],
          },
        },
      ],
    };

    // Execute SQL queries concurrently
    const [total, rows, groupSummary, inflowAgg, outflowNegAgg, outflowPosAgg] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { account: true },
      }),
      prisma.transaction.groupBy({
        by: ['account_id'],
        where,
        _count: { _all: true },
      }),
      prisma.transaction.aggregate({
        where: {
          ...nonTransferWhere,
          amount: { gt: 0 },
          OR: [
            { type: { equals: 'Inflow', mode: 'insensitive' } },
            { type: null },
          ],
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          ...nonTransferWhere,
          amount: { lt: 0 },
          OR: [
            { type: { equals: 'Outflow', mode: 'insensitive' } },
            { type: null },
          ],
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          ...nonTransferWhere,
          amount: { gt: 0 },
          type: { equals: 'Outflow', mode: 'insensitive' },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const accountSummary: Record<string, number> = {};
    for (const g of groupSummary) {
      accountSummary[g.account_id] = g._count._all;
    }

    const rawInflow = inflowAgg._sum.amount ? Number(inflowAgg._sum.amount) : 0;
    const rawOutflow =
      (outflowNegAgg._sum.amount ? Math.abs(Number(outflowNegAgg._sum.amount)) : 0) +
      (outflowPosAgg._sum.amount ? Number(outflowPosAgg._sum.amount) : 0);
    const totalInflow = Number(rawInflow.toFixed(2));
    const totalOutflow = Number(rawOutflow.toFixed(2));
    const netCashFlow = Number((totalInflow - totalOutflow).toFixed(2));

    return {
      transactions: rows.map(mapTransaction),
      total,
      totalInflow,
      totalOutflow,
      netCashFlow,
      page,
      limit,
      totalPages,
      accountSummary,
    };
  },

  async getTransactionById(id: string): Promise<Transaction | null> {
    const owner_id = getOwnerId();
    const row = await prisma.transaction.findFirst({
      where: { id, owner_id, deleted_at: null },
      include: { account: true },
    });
    return row ? mapTransaction(row) : null;
  },

  async recalculateAccountBalances(accountId: string, txClient: any = prisma): Promise<void> {
    const owner_id = getOwnerId();
    await txClient.$queryRaw`SELECT id FROM accounts WHERE id = ${accountId} FOR UPDATE`;
    const acc = await txClient.account.findFirst({
      where: { id: accountId, owner_id },
    });
    if (!acc) return;

    const isCard = acc.type === 'credit_card';
    const startingBalance = num(acc.opening_balance);

    const postedTxs = await txClient.transaction.findMany({
      where: {
        account_id: accountId,
        owner_id,
        deleted_at: null,
        status: 'posted',
      },
      orderBy: [{ date: 'asc' }, { created_at: 'asc' }, { id: 'asc' }],
    });

    let currentBalance = startingBalance;
    for (const t of postedTxs) {
      const amt = num(t.amount);
      if (isCard) {
        currentBalance = Math.round((currentBalance - amt) * 100) / 100;
      } else {
        currentBalance = Math.round((currentBalance + amt) * 100) / 100;
      }
      await txClient.transaction.update({
        where: { id: t.id },
        data: { running_balance: currentBalance },
      });
    }

    const finalBalance = postedTxs.length > 0 ? currentBalance : startingBalance;
    await txClient.account.update({
      where: { id: accountId },
      data: { balance: finalBalance },
    });
  },

  async createTransaction(data: Omit<Transaction, 'id'>): Promise<Transaction> {
    const owner_id = getOwnerId();
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

    const id = (data as any).id || crypto.randomUUID();
    const created = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${data.account_id} FOR UPDATE`;
      const rec = await tx.transaction.create({
        data: {
          id,
          owner_id,
          account_id: data.account_id,
          date: data.date,
          description: data.description || '',
          merchant: data.merchant || '',
          category: data.category || 'General',
          type: txType,
          amount: data.amount,
          debit: data.debit ?? (data.amount < 0 ? Math.abs(data.amount) : null),
          credit: data.credit ?? (data.amount > 0 ? data.amount : null),
          running_balance: data.running_balance ?? null,
          status: data.status || 'posted',
          cheque_number: data.cheque_number ?? null,
          foreign_spend_amount: data.foreign_spend_amount ?? null,
          commission: data.commission ?? null,
          exchange_rate: data.exchange_rate ?? null,
          additional_info: data.additional_info ?? null,
          address: data.address ?? null,
          city_province: data.city_province ?? null,
          country: data.country ?? null,
          reference_number: data.reference_number ?? null,
          source_file: data.source_file ?? null,
        },
        include: { account: true },
      });

      if (rec.status === 'posted') {
        await this.recalculateAccountBalances(rec.account_id, tx);
        const refreshed = await tx.transaction.findUnique({
          where: { id: rec.id },
          include: { account: true },
        });
        return refreshed || rec;
      }
      return rec;
    });

    return mapTransaction(created);
  },

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction | null> {
    const owner_id = getOwnerId();
    const existing = await prisma.transaction.findFirst({
      where: { id, owner_id, deleted_at: null },
    });
    if (!existing) return null;

    let category = existing.category;
    if (data.categories && Array.isArray(data.categories)) {
      category = data.categories.join(', ');
    } else if (data.category !== undefined) {
      category = data.category;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (data.date !== undefined) updateData.date = data.date;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.merchant !== undefined) updateData.merchant = data.merchant;
      if (category !== undefined) updateData.category = category;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.account_id !== undefined) updateData.account_id = data.account_id;
      if (data.reference_number !== undefined) updateData.reference_number = data.reference_number;
      if (data.source_file !== undefined) updateData.source_file = data.source_file;
      if (data.amount !== undefined) {
        updateData.amount = data.amount;
        updateData.debit = data.amount < 0 ? Math.abs(data.amount) : null;
        updateData.credit = data.amount > 0 ? data.amount : null;
      }

      const rec = await tx.transaction.update({
        where: { id },
        data: updateData,
        include: { account: true },
      });

      const needsRecalc =
        data.amount !== undefined ||
        data.status !== undefined ||
        data.date !== undefined ||
        data.account_id !== undefined;

      if (needsRecalc) {
        await this.recalculateAccountBalances(rec.account_id, tx);
        if (existing.account_id !== rec.account_id) {
          await this.recalculateAccountBalances(existing.account_id, tx);
        }
        const refreshed = await tx.transaction.findUnique({
          where: { id },
          include: { account: true },
        });
        return refreshed || rec;
      }
      return rec;
    });

    return mapTransaction(updated);
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const owner_id = getOwnerId();
    const existing = await prisma.transaction.findFirst({
      where: { id, owner_id, deleted_at: null },
    });
    if (!existing) return false;

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id },
        data: { deleted_at: new Date() },
      });
      if (existing.status === 'posted') {
        await this.recalculateAccountBalances(existing.account_id, tx);
      }
    });
    return true;
  },

  async getTrash(): Promise<TrashedTransaction[]> {
    const owner_id = getOwnerId();
    const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const rows = await prisma.transaction.findMany({
      where: {
        owner_id,
        deleted_at: { not: null, gte: cutoff },
      },
      include: { account: true },
      orderBy: { deleted_at: 'desc' },
    });

    return rows.map((r) => ({
      transaction: mapTransaction(r),
      deletedAt: r.deleted_at!.toISOString(),
    }));
  },

  async restoreTransactions(ids: string[]): Promise<Transaction[]> {
    const owner_id = getOwnerId();
    const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const trashed = await prisma.transaction.findMany({
      where: {
        id: { in: ids },
        owner_id,
        deleted_at: { not: null, gte: cutoff },
      },
    });

    if (trashed.length === 0) return [];

    const restoredRows = await prisma.$transaction(async (tx) => {
      await tx.transaction.updateMany({
        where: {
          id: { in: trashed.map((t) => t.id) },
          owner_id,
        },
        data: { deleted_at: null },
      });

      const affected = new Set(trashed.map((t) => t.account_id));
      for (const accId of affected) {
        await this.recalculateAccountBalances(accId, tx);
      }

      return tx.transaction.findMany({
        where: { id: { in: trashed.map((t) => t.id) } },
        include: { account: true },
      });
    });

    return restoredRows.map(mapTransaction);
  },

  async purgeTrash(olderThanDays = 30): Promise<number> {
    const owner_id = getOwnerId();
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const res = await prisma.transaction.deleteMany({
      where: {
        owner_id,
        deleted_at: { not: null, lt: cutoff },
      },
    });
    return res.count;
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
    const owner_id = getOwnerId();
    const existing = await prisma.transaction.findMany({
      where: { id: { in: ids }, owner_id, deleted_at: null },
    });
    if (existing.length === 0) return 0;

    const targetCategory = data.categories && data.categories.length > 0
      ? data.categories.join(', ')
      : data.category;
    const mode = data.mode || 'replace';
    const affectedAccounts = new Set<string>();

    await prisma.$transaction(async (tx) => {
      for (const t of existing) {
        const updateData: any = {};
        if (targetCategory) {
          if (mode === 'append' && t.category) {
            const existingCats = t.category.split(',').map((s) => s.trim()).filter(Boolean);
            const toAdd = targetCategory.split(',').map((s) => s.trim()).filter(Boolean);
            const merged = Array.from(new Set([...existingCats, ...toAdd]));
            updateData.category = merged.join(', ');
          } else {
            updateData.category = targetCategory;
          }
        }
        if (data.status) {
          updateData.status = data.status;
          affectedAccounts.add(t.account_id);
        }
        if (data.type) {
          const oldAmount = num(t.amount);
          updateData.type = data.type;
          if (data.type === 'Inflow') {
            if (oldAmount < 0) {
              updateData.amount = Math.abs(oldAmount);
              updateData.credit = Math.abs(oldAmount);
              updateData.debit = null;
              affectedAccounts.add(t.account_id);
            }
          } else if (data.type === 'Outflow') {
            if (oldAmount > 0) {
              updateData.amount = -Math.abs(oldAmount);
              updateData.debit = Math.abs(oldAmount);
              updateData.credit = null;
              affectedAccounts.add(t.account_id);
            }
          }
        }
        await tx.transaction.update({
          where: { id: t.id },
          data: updateData,
        });
      }

      for (const accId of affectedAccounts) {
        await this.recalculateAccountBalances(accId, tx);
      }
    });

    return existing.length;
  },

  async bulkDeleteTransactions(ids: string[]): Promise<number> {
    const owner_id = getOwnerId();
    const existing = await prisma.transaction.findMany({
      where: { id: { in: ids }, owner_id, deleted_at: null },
    });
    if (existing.length === 0) return 0;

    await prisma.$transaction(async (tx) => {
      await tx.transaction.updateMany({
        where: { id: { in: ids }, owner_id },
        data: { deleted_at: new Date() },
      });

      const affected = new Set<string>();
      for (const t of existing) {
        if (t.status === 'posted') affected.add(t.account_id);
      }
      for (const accId of affected) {
        await this.recalculateAccountBalances(accId, tx);
      }
    });

    return existing.length;
  },

  // BILLS
  async getBills(): Promise<Bill[]> {
    const owner_id = getOwnerId();
    const [dbBills, accounts] = await Promise.all([
      prisma.bill.findMany({
        where: { owner_id },
        include: { linked_account: true },
        orderBy: { due_day: 'asc' },
      }),
      prisma.account.findMany({
        where: { owner_id },
      }),
    ]);

    const mappedBills = dbBills.map(mapBill);
    const existingLinkedCardIds = new Set(
      mappedBills.filter((b) => b.linked_account_id).map((b) => b.linked_account_id)
    );

    // Auto-generate due date reminders for credit cards if not already present
    for (const acc of accounts) {
      const balance = num(acc.balance);
      if (acc.type === 'credit_card' && !existingLinkedCardIds.has(acc.id) && balance > 0) {
        const autoDueDay = acc.bank_name.toLowerCase().includes('cibc')
          ? 21
          : acc.bank_name.toLowerCase().includes('td')
          ? 27
          : 18;
        const autoDueDate = acc.due_date || getNextDueDate(autoDueDay);
        const minPay =
          numOrUndef(acc.minimum_payment) ||
          Math.max(10, Math.min(balance, Math.round(balance * 0.03 * 100) / 100));

        mappedBills.push({
          id: `cc-auto-${acc.id}`,
          name: `${acc.account_name} Payment`,
          type: 'credit_card',
          amount: minPay,
          due_day: autoDueDay,
          frequency: 'monthly',
          linked_account_id: acc.id,
          linked_account: mapAccount(acc),
          autopay: false,
          next_due_date: autoDueDate,
          is_paid: false,
          notes: `Auto-calculated minimum payment based on current balance of ${formatCAD(balance)}. Statement cycle +21 days.`,
          created_at: new Date().toISOString(),
        });
      }
    }

    return mappedBills;
  },

  async createBill(data: Omit<Bill, 'id'>): Promise<Bill> {
    const owner_id = getOwnerId();
    const row = await prisma.bill.create({
      data: {
        id: (data as any).id || crypto.randomUUID(),
        owner_id,
        name: data.name,
        type: data.type,
        amount: data.amount,
        due_day: data.due_day,
        frequency: data.frequency || 'monthly',
        linked_account_id: data.linked_account_id ?? null,
        autopay: data.autopay ?? false,
        next_due_date: data.next_due_date,
        is_paid: data.is_paid ?? false,
        notes: data.notes ?? null,
      },
      include: { linked_account: true },
    });
    return mapBill(row);
  },

  async updateBill(id: string, data: Partial<Bill>): Promise<Bill | null> {
    const owner_id = getOwnerId();
    const existing = await prisma.bill.findFirst({
      where: { id, owner_id },
    });
    if (!existing) return null;

    const row = await prisma.bill.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        amount: data.amount,
        due_day: data.due_day,
        frequency: data.frequency,
        linked_account_id: data.linked_account_id,
        autopay: data.autopay,
        next_due_date: data.next_due_date,
        is_paid: data.is_paid,
        notes: data.notes,
      },
      include: { linked_account: true },
    });
    return mapBill(row);
  },

  async deleteBill(id: string): Promise<boolean> {
    const owner_id = getOwnerId();
    if (id.startsWith('cc-auto-')) return true;

    const existing = await prisma.bill.findFirst({
      where: { id, owner_id },
    });
    if (!existing) return false;

    await prisma.bill.delete({
      where: { id },
    });
    return true;
  },

  async markBillPaid(id: string, createTx = false): Promise<Bill | null> {
    const owner_id = getOwnerId();
    let bill = await prisma.bill.findFirst({
      where: { id, owner_id },
      include: { linked_account: true },
    });

    // Support paying auto-generated credit-card bills
    if (!bill && id.startsWith('cc-auto-')) {
      const accId = id.replace('cc-auto-', '');
      const acc = await prisma.account.findFirst({
        where: { id: accId, owner_id },
      });
      if (acc) {
        const balance = num(acc.balance);
        const autoDueDay = acc.bank_name.toLowerCase().includes('cibc')
          ? 21
          : acc.bank_name.toLowerCase().includes('td')
          ? 27
          : 18;
        const autoDueDate = acc.due_date || getNextDueDate(autoDueDay);
        const minPay =
          numOrUndef(acc.minimum_payment) ||
          Math.max(10, Math.min(balance, Math.round(balance * 0.03 * 100) / 100));

        bill = await prisma.bill.create({
          data: {
            id,
            owner_id,
            name: `${acc.account_name} Payment`,
            type: 'credit_card',
            amount: minPay,
            due_day: autoDueDay,
            frequency: 'monthly',
            linked_account_id: acc.id,
            autopay: false,
            next_due_date: autoDueDate,
            is_paid: false,
          },
          include: { linked_account: true },
        });
      }
    }

    if (!bill) return null;

    const nextDueDate = advanceDueDate(bill.next_due_date, bill.frequency, bill.due_day);
    const updated = await prisma.bill.update({
      where: { id: bill.id },
      data: {
        next_due_date: nextDueDate,
        is_paid: false,
      },
      include: { linked_account: true },
    });

    if (createTx && bill.linked_account_id) {
      await this.createTransaction({
        account_id: bill.linked_account_id,
        date: new Date().toISOString().split('T')[0],
        description: `Bill Payment: ${bill.name}`,
        merchant: bill.name,
        category:
          bill.type === 'rent'
            ? 'Rent & Housing'
            : bill.type === 'utility'
            ? 'Utilities & Phone'
            : 'General',
        amount: -num(bill.amount),
        debit: num(bill.amount),
        credit: null,
        status: 'posted',
        source_file: 'manual_bill_payment',
      });
    }

    return mapBill(updated);
  },

  // CREDIT REPORTS
  async getCreditReports(): Promise<CreditReport[]> {
    const owner_id = getOwnerId();
    const rows = await prisma.creditReport.findMany({
      where: { owner_id },
      orderBy: { uploaded_at: 'desc' },
    });
    return rows.map(mapCreditReport);
  },

  async createCreditReport(data: Omit<CreditReport, 'id' | 'uploaded_at'>): Promise<CreditReport> {
    const owner_id = getOwnerId();
    const row = await prisma.creditReport.create({
      data: {
        id: (data as any).id || crypto.randomUUID(),
        owner_id,
        bureau: data.bureau,
        file_url: data.file_url,
        file_name: data.file_name,
        score: data.score,
        utilization_percent: data.utilization_percent,
        total_debt: data.total_debt,
        open_accounts: data.open_accounts as any,
        closed_accounts: data.closed_accounts as any,
        inquiries: data.inquiries as any,
        derogatories: data.derogatories as any,
        extracted_text: data.extracted_text ?? null,
        extracted_json: data.extracted_json ?? null,
      },
    });
    return mapCreditReport(row);
  },

  // AI CHAT HISTORY
  async getAiChatHistory(): Promise<AiChatMessage[]> {
    const owner_id = getOwnerId();
    const rows = await prisma.aiChatHistory.findMany({
      where: { owner_id },
      orderBy: { created_at: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      role: r.role as 'user' | 'assistant' | 'system',
      content: r.content,
      function_calls: r.function_calls,
      created_at: r.created_at.toISOString(),
    }));
  },

  async addAiChatMessage(role: 'user' | 'assistant', content: string, functionCalls?: any): Promise<AiChatMessage> {
    const owner_id = getOwnerId();
    const row = await prisma.aiChatHistory.create({
      data: {
        id: crypto.randomUUID(),
        owner_id,
        role,
        content,
        function_calls: functionCalls ?? null,
      },
    });
    return {
      id: row.id,
      role: row.role as 'user' | 'assistant' | 'system',
      content: row.content,
      function_calls: row.function_calls,
      created_at: row.created_at.toISOString(),
    };
  },

  async clearAiChatHistory(): Promise<boolean> {
    const owner_id = getOwnerId();
    await prisma.aiChatHistory.deleteMany({
      where: { owner_id },
    });
    return true;
  },

  // CATEGORIES
  async getCategories(): Promise<CategoryItem[]> {
    const owner_id = getOwnerId();
    const catMap = new Map<string, CategoryItem>();

    const rows = await prisma.category.findMany({
      where: { owner_id },
      orderBy: { name: 'asc' },
    });

    for (const r of rows) {
      catMap.set(r.name.toLowerCase(), mapCategory(r));
    }

    // Also include any distinct category present in active transactions
    const distinctTxCats = await prisma.transaction.findMany({
      where: { owner_id, deleted_at: null },
      select: { category: true },
      distinct: ['category'],
    });

    for (const t of distinctTxCats) {
      if (!t.category) continue;
      const parts = t.category.split(',').map((s) => s.trim()).filter(Boolean);
      for (const single of parts) {
        if (!catMap.has(single.toLowerCase())) {
          catMap.set(single.toLowerCase(), {
            id: `cat-${single.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            name: single,
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
    const owner_id = getOwnerId();
    const cleanName = data.name.trim();

    const row = await prisma.category.upsert({
      where: {
        owner_id_name: {
          owner_id,
          name: cleanName,
        },
      },
      create: {
        id: crypto.randomUUID(),
        owner_id,
        name: cleanName,
        color: data.color || '#3b82f6',
        icon: data.icon || 'Tag',
      },
      update: {
        color: data.color || undefined,
        icon: data.icon || undefined,
      },
    });

    return mapCategory(row);
  },

  async deleteCategory(
    nameOrId: string,
    reassignTo?: string
  ): Promise<{ success: boolean; affectedCount: number }> {
    const owner_id = getOwnerId();
    const cat = await prisma.category.findFirst({
      where: {
        owner_id,
        OR: [
          { id: nameOrId },
          { name: { equals: nameOrId, mode: 'insensitive' } },
        ],
      },
    });

    const targetName = cat ? cat.name : nameOrId;
    const cleanReassign = reassignTo?.trim() || '';

    return prisma.$transaction(async (tx) => {
      // Delete from category table
      await tx.category.deleteMany({
        where: {
          owner_id,
          OR: [
            { id: nameOrId },
            { name: { equals: targetName, mode: 'insensitive' } },
          ],
        },
      });

      if (cleanReassign && cleanReassign !== 'General') {
        await tx.category.upsert({
          where: { owner_id_name: { owner_id, name: cleanReassign } },
          create: {
            id: crypto.randomUUID(),
            owner_id,
            name: cleanReassign,
            color: '#6366f1',
            icon: 'Tag',
          },
          update: {},
        });
      }

      // Reassign transactions
      const txs = await tx.transaction.findMany({
        where: {
          owner_id,
          category: { contains: targetName, mode: 'insensitive' },
        },
      });

      let affectedCount = 0;
      for (const t of txs) {
        const parts = t.category.split(',').map((s) => s.trim()).filter(Boolean);
        const idx = parts.findIndex(
          (p) => p.toLowerCase() === targetName.toLowerCase() || p.toLowerCase() === nameOrId.toLowerCase()
        );
        if (idx !== -1) {
          affectedCount++;
          if (cleanReassign) {
            parts[idx] = cleanReassign;
          } else {
            parts.splice(idx, 1);
          }
          const unique = Array.from(new Set(parts));
          const newCategory = unique.length > 0 ? unique.join(', ') : 'General';
          await tx.transaction.update({
            where: { id: t.id },
            data: { category: newCategory },
          });
        }
      }

      return { success: true, affectedCount };
    });
  },

  async getCategoryUsageCount(nameOrId: string): Promise<number> {
    const owner_id = getOwnerId();
    const clean = nameOrId.toLowerCase().trim();
    const txs = await prisma.transaction.findMany({
      where: {
        owner_id,
        category: { contains: clean, mode: 'insensitive' },
        deleted_at: null,
      },
      select: { category: true },
    });

    let count = 0;
    for (const t of txs) {
      if (!t.category) continue;
      const parts = t.category.split(',').map((s) => s.trim().toLowerCase());
      if (parts.includes(clean)) count++;
    }
    return count;
  },
};
