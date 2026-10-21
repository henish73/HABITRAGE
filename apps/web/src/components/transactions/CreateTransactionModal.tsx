'use client';

import React, { useState } from 'react';
import { useFinanceStore } from '@/lib/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, DollarSign, Calendar, Tag, Building2, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function CreateTransactionModal() {
  const { isAddTransactionOpen, closeAddTransaction } = useFinanceStore();
  const queryClient = useQueryClient();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Food - Restaurants & Dining');
  const [type, setType] = useState<'Outflow' | 'Inflow' | 'Transfers'>('Outflow');
  const [amountStr, setAmountStr] = useState('');
  const [status, setStatus] = useState<'posted' | 'pending'>('posted');
  const [isAddingCustomCat, setIsAddingCustomCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      return res.json();
    },
  });

  const accounts = accountsData?.accounts || [];
  const fetchedCategories = categoriesData?.categories || [];

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Category "${data.category.name}" created!`);
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        setCategory(data.category.name);
        setIsAddingCustomCat(false);
        setNewCatName('');
      } else {
        toast.error(data.error || 'Failed to add category');
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(status === 'pending' ? 'Pending transaction created!' : 'Transaction posted and balance recalculated!');
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        closeAddTransaction();
        setDescription('');
        setMerchant('');
        setAmountStr('');
      } else {
        toast.error(data.error || 'Failed to create transaction');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error creating transaction');
    },
  });

  if (!isAddTransactionOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(amountStr);
    if (!parsedAmt || isNaN(parsedAmt) || parsedAmt <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }
    const finalAccountId = accountId || (accounts.length > 0 ? accounts[0].id : '');
    if (!finalAccountId) {
      toast.error('Please select an account');
      return;
    }

    // Expense is negative, income is positive, transfers negative (debit)
    const finalAmount = type === 'Inflow' ? parsedAmt : -parsedAmt;

    createMutation.mutate({
      account_id: finalAccountId,
      date,
      description: description.trim(),
      merchant: merchant.trim() || description.trim(),
      category,
      type,
      amount: finalAmount,
      debit: type === 'Inflow' ? null : parsedAmt,
      credit: type === 'Inflow' ? parsedAmt : null,
      status,
      source_file: 'manual_entry',
    });
  };

  const defaultCategoriesList = [
    'Food - Restaurants & Dining',
    'Food - Delivery',
    'Groceries',
    'Transportation - Rideshare & Gas',
    'Transportation - Public Transit',
    'Shopping - Retail & Online',
    'Utilities & Phone',
    'Rent & Housing',
    'Income / Payroll',
    'Transfers',
    'Bank Fees',
    'Miscellaneous',
  ];

  const categoryNames = Array.from(
    new Set([
      ...fetchedCategories.map((c: any) => c.name),
      ...defaultCategoriesList,
    ])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl p-6 relative">
        <button
          onClick={closeAddTransaction}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Add New Transaction</h3>
            <p className="text-xs text-muted-foreground">Record entry with immediate running balance calculation</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Inflow / Outflow / Transfers 3-Way Toggle */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 p-1 rounded-2xl bg-muted border border-border">
              <button
                type="button"
                onClick={() => setType('Outflow')}
                className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                  type === 'Outflow' ? 'bg-card text-negative shadow-sm' : 'text-muted-foreground'
                }`}
              >
                - Outflow
              </button>
              <button
                type="button"
                onClick={() => setType('Inflow')}
                className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                  type === 'Inflow' ? 'bg-card text-positive shadow-sm' : 'text-muted-foreground'
                }`}
              >
                + Inflow
              </button>
              <button
                type="button"
                onClick={() => setType('Transfers')}
                className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                  type === 'Transfers' ? 'bg-card text-accent shadow-sm' : 'text-muted-foreground'
                }`}
              >
                ⇄ Transfer
              </button>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5" /> Amount (CAD)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="45.50"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5" /> Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Account Selector */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
              <Building2 className="w-3.5 h-3.5" /> Linked Account
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="">Select Account...</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.bank_name} - {a.account_name} ({a.account_number})
                </option>
              ))}
            </select>
          </div>

          {/* Description & Merchant */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <FileText className="w-3.5 h-3.5" /> Description
              </label>
              <input
                type="text"
                required
                placeholder="e.g. FreshCo Grocery Brampton"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                Merchant
              </label>
              <input
                type="text"
                placeholder="e.g. FreshCo"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Category
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomCat(!isAddingCustomCat)}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  {isAddingCustomCat ? 'Select' : '+ New'}
                </button>
              </div>

              {isAddingCustomCat ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="New category..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!newCatName.trim() || createCategoryMutation.isPending}
                    onClick={() => createCategoryMutation.mutate(newCatName.trim())}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                >
                  {categoryNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
              >
                <option value="posted">Posted (updates ledger)</option>
                <option value="pending">Pending (authorization hold)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={closeAddTransaction}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/25 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{createMutation.isPending ? 'Saving...' : 'Save Transaction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
