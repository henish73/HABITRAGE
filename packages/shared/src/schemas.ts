import { z } from 'zod';

export const accountSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(['bank', 'credit_card']),
  bank_name: z.string().min(1, 'Bank name is required'),
  account_name: z.string().min(1, 'Account name is required'),
  account_number: z.string().min(1, 'Account number is required'),
  account_type: z.string().min(1, 'Account type is required'),
  balance: z.number().default(0),
  credit_limit: z.number().nullable().optional(),
});

const isValidDateString = (val: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const [y, m, d] = val.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
};

export const createTransactionSchema = z.object({
  account_id: z.string().uuid('Valid account is required'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .refine(isValidDateString, { message: 'Invalid calendar date' }),
  description: z.string().min(1, 'Description is required'),
  merchant: z.string().optional().default(''),
  category: z.string().optional().default('General'),
  type: z.enum(['Inflow', 'Outflow', 'Transfers']).optional().default('Outflow'),
  amount: z.number().finite('Amount must be a finite number'), // negative for expense, positive for income
  debit: z.number().finite().nullable().optional(),
  credit: z.number().finite().nullable().optional(),
  status: z.enum(['posted', 'pending']).default('posted'),
  cheque_number: z.string().nullable().optional(),
  reference_number: z.string().nullable().optional(),
  additional_info: z.string().nullable().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').trim(),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

export const updateTransactionSchema = createTransactionSchema.partial().extend({
  id: z.string().uuid(),
});

export const createBillSchema = z.object({
  name: z.string().min(1, 'Bill name is required'),
  type: z.enum(['rent', 'credit_card', 'utility', 'subscription', 'other']),
  amount: z.number().positive('Amount must be positive').finite(),
  due_day: z.number().int().min(1).max(31),
  frequency: z.enum(['monthly', 'weekly', 'biweekly']).default('monthly'),
  linked_account_id: z.string().uuid().nullable().optional(),
  autopay: z.boolean().default(false),
  next_due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .refine(isValidDateString, { message: 'Invalid calendar date' }),
  notes: z.string().nullable().optional(),
});

export const updateBillSchema = createBillSchema.partial().extend({
  id: z.string().uuid(),
  is_paid: z.boolean().optional(),
});

export const transactionFilterSchema = z.object({
  search: z.string().optional(),
  account_ids: z.array(z.string()).optional(),
  banks: z.array(z.string()).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  amount_min: z.number().optional(),
  amount_max: z.number().optional(),
  categories: z.array(z.string()).optional(),
  type: z.string().optional(),
  types: z.array(z.string()).optional(),
  status: z.enum(['posted', 'pending', 'all']).optional(),
  source_file: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(50),
  sort_by: z
    .enum(['date', 'amount', 'merchant', 'category', 'classification', 'type', 'node', 'source_node'])
    .optional()
    .default('date'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});
