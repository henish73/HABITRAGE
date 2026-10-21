'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Transaction,
  formatCAD,
  STANDARD_CATEGORIES,
  getNodeLabel,
  CategoryItem,
} from '@financeos/shared';
import {
  X,
  CreditCard,
  Building2,
  Calendar,
  Tag,
  DollarSign,
  FileText,
  MapPin,
  Hash,
  FileSpreadsheet,
  Globe,
  Clock,
  CheckCircle2,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  Plus,
  Loader2,
  Edit2,
  Save,
  RotateCcw,
  Search,
  Trash2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface TransactionDrawerProps {
  transaction: Transaction | null;
  onClose: () => void;
  onUpdate?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
  accounts?: any[];
  allCategories?: string[];
}

export function TransactionDrawer({
  transaction,
  onClose,
  onUpdate,
  onDelete,
  accounts: propAccounts,
  allCategories: propCategories,
}: TransactionDrawerProps) {
  const queryClient = useQueryClient();

  // Fetch accounts if not passed
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
    enabled: !propAccounts || propAccounts.length === 0,
  });

  // Fetch categories if not passed
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      return res.json();
    },
    enabled: !propCategories || propCategories.length === 0,
  });

  const accounts = propAccounts || accountsData?.accounts || [];
  const fetchedCatNames = (categoriesData?.categories || []).map((c: CategoryItem) => c.name);
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    (propCategories || fetchedCatNames || []).forEach((c: string) => set.add(c));
    STANDARD_CATEGORIES.forEach((c) => set.add(c));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [propCategories, fetchedCatNames]);

  // Form editable states
  const [amount, setAmount] = useState<number>(0);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState('');

  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [type, setType] = useState<'Inflow' | 'Outflow' | 'Transfers'>('Outflow');
  const [status, setStatus] = useState<'posted' | 'pending'>('posted');
  const [accountId, setAccountId] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [newCatInput, setNewCatInput] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedSummary, setLastSavedSummary] = useState<{
    merchant: string;
    amount: number;
    timestamp: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Local synced copy of transaction to immediately clear dirty state upon database success
  const [localTx, setLocalTx] = useState<Transaction | null>(transaction);

  // Initialize and synchronize state when transaction changes
  useEffect(() => {
    if (transaction) {
      setLocalTx(transaction);
      setSaveStatus('idle');
      setAmount(transaction.amount);
      setAmountInput(Math.abs(transaction.amount).toFixed(2));
      setDate(transaction.date);
      setDescription(transaction.description || '');
      setMerchant(transaction.merchant || '');
      setType(
        (transaction.type as any) ||
          (transaction.amount > 0 ? 'Inflow' : 'Outflow')
      );
      setStatus(transaction.status);
      setAccountId(transaction.account_id);
      const cats = transaction.category
        ? transaction.category.split(',').map((c) => c.trim()).filter(Boolean)
        : ['General'];
      setCategories(cats);
      setReferenceNumber(transaction.reference_number || '');
      setIsEditingAmount(false);
      setShowCatPicker(false);
      setCatSearch('');
      setNewCatInput('');
    }
  }, [transaction]);

  // Keyboard shortcut: Ctrl+S / Cmd+S to save, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transaction, localTx, amount, amountInput, date, description, merchant, type, status, accountId, categories, referenceNumber]);

  if (!transaction) return null;

  // Determine dirty state against most recently saved transaction
  const baseTx = localTx || transaction;
  const isDirty =
    amount !== baseTx.amount ||
    date !== baseTx.date ||
    description !== (baseTx.description || '') ||
    merchant !== (baseTx.merchant || '') ||
    type !== (baseTx.type || (baseTx.amount > 0 ? 'Inflow' : 'Outflow')) ||
    status !== baseTx.status ||
    accountId !== baseTx.account_id ||
    categories.join(', ') !== (baseTx.category || '') ||
    referenceNumber !== (baseTx.reference_number || '');

  // Handle Save
  const handleSave = async (overrides?: Partial<Transaction>) => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      let resolvedAmount = amount;
      const parsed = parseFloat(amountInput);
      if (!isNaN(parsed)) {
        resolvedAmount = type === 'Outflow' ? -Math.abs(parsed) : Math.abs(parsed);
      }

      const updatedData = {
        amount: overrides?.amount !== undefined ? overrides.amount : resolvedAmount,
        date: overrides?.date || date,
        description: overrides?.description || description,
        merchant: overrides?.merchant || merchant,
        type: overrides?.type || type,
        status: overrides?.status || status,
        account_id: overrides?.account_id || accountId,
        category: (overrides?.categories || categories).join(', '),
        categories: overrides?.categories || categories,
        reference_number: overrides?.reference_number !== undefined ? overrides.reference_number : referenceNumber,
      };

      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      const data = await res.json();
      if (data.success && data.transaction) {
        setLocalTx(data.transaction);
        setSaveStatus('saved');
        setLastSavedSummary({
          merchant: data.transaction.merchant || data.transaction.description || 'Transaction',
          amount: data.transaction.amount,
          timestamp: new Date().toLocaleTimeString(),
        });

        // Optimistically update all transaction caches immediately across all active queryKeys
        queryClient.setQueriesData({ queryKey: ['transactions'] }, (old: any) => {
          if (!old || !Array.isArray(old.transactions)) return old;
          return {
            ...old,
            transactions: old.transactions.map((t: any) =>
              t.id === transaction.id ? { ...t, ...data.transaction } : t
            ),
          };
        });
        toast.success('✓ Successfully updated in database');
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        setIsEditingAmount(false);
        onUpdate?.(data.transaction);
      } else {
        setSaveStatus('error');
        toast.error(data.error || 'Failed to update transaction');
      }
    } catch (err: any) {
      setSaveStatus('error');
      toast.error(err.message || 'Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Direct Delete Handler (Self-contained, works with or without onDelete prop)
  const handleDirectDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok || res.status === 404) {
        // Optimistically remove from all query caches
        queryClient.setQueriesData({ queryKey: ['transactions'] }, (old: any) => {
          if (!old || !Array.isArray(old.transactions)) return old;
          return {
            ...old,
            transactions: old.transactions.filter((t: any) => t.id !== transaction.id),
            total: Math.max(0, (old.total || 1) - 1),
          };
        });
        toast.success('Transaction permanently removed from database');
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        onDelete?.(transaction);
        onClose();
      } else {
        toast.error(data.error || 'Failed to delete transaction');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting transaction');
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  // Quick Type change handler
  const handleTypeChange = (newType: 'Inflow' | 'Outflow' | 'Transfers') => {
    setType(newType);
    let newAmount = amount;
    if (newType === 'Inflow' && amount < 0) {
      newAmount = Math.abs(amount);
      setAmount(newAmount);
      setAmountInput(newAmount.toFixed(2));
    } else if (newType === 'Outflow' && amount > 0) {
      newAmount = -Math.abs(amount);
      setAmount(newAmount);
      setAmountInput(Math.abs(newAmount).toFixed(2));
    }
  };

  // Category Add / Remove
  const handleRemoveCategory = (catToRemove: string) => {
    const next = categories.filter((c) => c !== catToRemove);
    setCategories(next.length > 0 ? next : ['General']);
  };

  const handleAddCategory = (catToAdd: string) => {
    if (!catToAdd.trim()) return;
    const clean = catToAdd.trim();
    if (!categories.includes(clean)) {
      setCategories([...categories, clean]);
    }
    setNewCatInput('');
    setShowCatPicker(false);
  };

  // Amount Input Submit
  const handleAmountSubmit = () => {
    const num = parseFloat(amountInput);
    if (!isNaN(num)) {
      const signed = type === 'Outflow' ? -Math.abs(num) : Math.abs(num);
      setAmount(signed);
    }
    setIsEditingAmount(false);
  };

  const isExpense = amount < 0;
  const currentAccount = accounts.find((a: any) => a.id === accountId) || transaction.account;
  const sourceNode = getNodeLabel(currentAccount);

  const filteredAvailableCategories = allCategories
    .filter((c) => !categories.includes(c))
    .filter((c) => !catSearch.trim() || c.toLowerCase().includes(catSearch.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-card h-full border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header - Sticky & Always Visible */}
        <div className="shrink-0 p-4 border-b border-border flex items-center justify-between bg-card/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs ${
                type === 'Inflow'
                  ? 'bg-positive/15 text-positive border border-positive/30'
                  : type === 'Transfers'
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'bg-negative/15 text-negative border border-negative/30'
              }`}
            >
              {type === 'Inflow' ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : type === 'Transfers' ? (
                <ArrowLeftRight className="w-5 h-5" />
              ) : (
                <DollarSign className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-foreground line-clamp-1">
                  {merchant || description || 'Transaction Details'}
                </h3>
                {isDirty && (
                  <span className="w-2 h-2 rounded-full bg-warning animate-pulse" title="Unsaved changes" />
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="font-semibold text-foreground">{sourceNode}</span>
                <span>•</span>
                <span className="font-mono text-muted-foreground">{date}</span>
                {isDirty && <span className="text-[10px] text-warning font-semibold">(Unsaved changes)</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-primary/15 text-primary border border-primary/30 flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && !isDirty && !isSaving && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-positive/15 text-positive border border-positive/30 flex items-center gap-1.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved to DB</span>
              </span>
            )}
            {isDirty && !isSaving && (
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm cursor-pointer transition-all animate-pulse"
                title="Save changes to database (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all cursor-pointer"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Shneiderman Rule 3 & 4: Explicit Database Save Confirmation Banner */}
        {isSaving && (
          <div className="mx-5 mt-3 p-3 rounded-2xl bg-primary/10 border border-primary/25 flex items-center gap-3 text-xs animate-in fade-in duration-150">
            <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-primary">Saving changes to database...</div>
              <div className="text-[11px] text-muted-foreground truncate">Writing to PostgreSQL & synchronizing transaction ledger</div>
            </div>
          </div>
        )}

        {saveStatus === 'saved' && lastSavedSummary && !isDirty && (
          <div className="mx-5 mt-3 p-3 rounded-2xl bg-positive/10 border border-positive/30 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-positive/20 text-positive flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-positive flex items-center gap-1.5">
                  <span>Verified & Saved in Database</span>
                  <span className="text-[10px] text-muted-foreground font-mono">({lastSavedSummary.timestamp})</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  "{lastSavedSummary.merchant}" committed to PostgreSQL & seed cache.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSaveStatus('idle')}
              className="p-1 rounded-lg hover:bg-positive/20 text-muted-foreground hover:text-positive transition-colors shrink-0"
              title="Dismiss confirmation"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Amount Highlight & Status Box */}
          <div className="p-5 bg-muted/30 border-b border-border text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                {type === 'Inflow'
                  ? 'INCOME / DEPOSIT'
                  : type === 'Transfers'
                  ? 'INTERNAL TRANSFER'
                  : 'CHARGE / WITHDRAWAL'}
              </span>
            </div>

          {/* Amount Display or Edit Input */}
          {isEditingAmount ? (
            <div className="flex items-center justify-center gap-2 py-1">
              <button
                type="button"
                onClick={() => {
                  const nextType = type === 'Inflow' ? 'Outflow' : 'Inflow';
                  handleTypeChange(nextType);
                }}
                className={`text-base font-black px-2.5 py-1 rounded-xl border transition-all ${
                  type === 'Inflow'
                    ? 'bg-positive/15 text-positive border-positive/30'
                    : 'bg-negative/15 text-negative border-negative/30'
                }`}
                title="Click to toggle + / -"
              >
                {type === 'Inflow' ? '+' : '-'}
              </button>
              <span className="text-xl font-bold text-muted-foreground">CAD $</span>
              <input
                type="number"
                step="0.01"
                autoFocus
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed)) {
                    setAmount(type === 'Outflow' ? -Math.abs(parsed) : Math.abs(parsed));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAmountSubmit();
                  if (e.key === 'Escape') setIsEditingAmount(false);
                }}
                className="w-36 text-3xl font-extrabold tracking-tight bg-secondary border-2 border-primary px-2 py-0.5 rounded-xl text-center focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAmountSubmit}
                className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                title="Done editing amount"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsEditingAmount(true)}
                title="Click to edit amount"
                className="group inline-flex items-center justify-center gap-2 px-3 py-1 rounded-2xl hover:bg-secondary/60 transition-all border border-transparent hover:border-border cursor-pointer"
              >
                <span
                  className={`text-3xl font-extrabold tracking-tight tabular-nums transition-all ${
                    isExpense ? 'text-negative' : 'text-positive'
                  }`}
                >
                  {formatCAD(amount, true)}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-primary flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-md border border-border/80">
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </span>
              </button>
            </div>
          )}

          {/* Interactive Status Toggle & Currency */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <div className="inline-flex items-center p-0.5 rounded-full bg-secondary border border-border">
              <button
                type="button"
                onClick={() => setStatus('posted')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 ${
                  status === 'posted'
                    ? 'bg-positive text-positive-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>POSTED</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 ${
                  status === 'pending'
                    ? 'bg-warning text-warning-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>PENDING</span>
              </button>
            </div>

            <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border">
              CAD Currency
            </span>
          </div>
        </div>

        {/* Interactive Editable Fields List */}
        <div className="flex-1 p-6 space-y-4 text-xs">
          <div className="space-y-4">
            {/* 1. Transaction Type 3-Way Selector */}
            <div className="py-2 border-b border-border/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                  <ArrowUpDown className="w-3.5 h-3.5 text-primary" /> Transaction Type
                </span>
                <span className="text-[10px] text-muted-foreground">Click to toggle</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 bg-secondary/80 p-1 rounded-xl border border-border">
                {[
                  { id: 'Inflow', label: '+ Inflow', color: 'emerald' },
                  { id: 'Outflow', label: '- Outflow', color: 'rose' },
                  { id: 'Transfers', label: '⇄ Transfer', color: 'indigo' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTypeChange(t.id as any)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                      type === t.id
                        ? t.id === 'Inflow'
                          ? 'bg-positive text-positive-foreground shadow-xs'
                          : t.id === 'Transfers'
                          ? 'bg-accent text-accent-foreground shadow-xs'
                          : 'bg-negative text-negative-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Merchant & Statement Description */}
            <div className="py-2 border-b border-border/50 space-y-2.5">
              <div>
                <label className="text-muted-foreground flex items-center gap-1.5 font-semibold mb-1">
                  <FileText className="w-3.5 h-3.5 text-primary" /> Merchant / Clean Name
                </label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="e.g. Tim Hortons, Uber, Presto"
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-secondary border border-border focus:ring-1 focus:ring-primary focus:outline-none text-foreground font-semibold"
                />
              </div>

              <div>
                <label className="text-muted-foreground flex items-center gap-1.5 font-semibold mb-1">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Full Statement Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Raw statement description"
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-secondary border border-border focus:ring-1 focus:ring-primary focus:outline-none text-foreground font-mono"
                />
              </div>
            </div>

            {/* 3. Transaction Date */}
            <div className="py-2 border-b border-border/50 flex items-center justify-between">
              <label htmlFor="tx-drawer-date-input" className="text-muted-foreground flex items-center gap-1.5 font-semibold cursor-pointer">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Date
              </label>
              <input
                id="tx-drawer-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-secondary border border-border focus:ring-1 focus:ring-primary focus:outline-none text-foreground cursor-pointer"
              />
            </div>

            {/* 4. Category & Multi-Category Attachments */}
            <div className="py-2 border-b border-border/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                  <Tag className="w-3.5 h-3.5 text-primary" /> Categories ({categories.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowCatPicker(!showCatPicker)}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showCatPicker ? 'Close Picker' : 'Attach Category'}</span>
                </button>
              </div>

              {/* Current Attached Categories Chips */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {categories.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-primary text-primary-foreground shadow-xs animate-in zoom-in-95 duration-100"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(c)}
                      title={`Remove ${c}`}
                      className="hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Quick Add Suggestions */}
              {!showCatPicker && (
                <div className="pt-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                    Quick Add:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Food & Dining',
                      'Groceries',
                      'Transfers',
                      'Income',
                      'Utilities',
                      'Shopping',
                      'Transportation',
                      'Subscriptions',
                    ]
                      .filter((sc) => !categories.includes(sc))
                      .slice(0, 5)
                      .map((sc) => (
                        <button
                          key={sc}
                          type="button"
                          onClick={() => handleAddCategory(sc)}
                          className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5 text-primary" />
                          <span>{sc}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Category Picker Dropdown / Creator */}
              {showCatPicker && (
                <div className="p-3 rounded-2xl bg-secondary border border-border space-y-2 animate-in fade-in duration-150">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={catSearch}
                      onChange={(e) => setCatSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-card border border-border focus:outline-none"
                    />
                  </div>

                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Click to attach:
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
                    {filteredAvailableCategories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleAddCategory(c)}
                        className="px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-card hover:bg-muted text-foreground border border-border transition-all cursor-pointer"
                      >
                        + {c}
                      </button>
                    ))}
                    {filteredAvailableCategories.length === 0 && (
                      <span className="text-xs text-muted-foreground italic py-1">No matching categories</span>
                    )}
                  </div>

                  {/* Inline New Category */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border/60">
                    <input
                      type="text"
                      placeholder="Or type new custom category..."
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCategory(newCatInput);
                        }
                      }}
                      className="flex-1 h-7 px-2.5 text-xs rounded-lg bg-card border border-border focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCategory(newCatInput)}
                      className="px-2.5 h-7 text-xs font-semibold rounded-lg bg-primary text-primary-foreground cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Bank & Account (Source Node) */}
            <div className="py-2 border-b border-border/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Bank & Account (Source Node)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary text-foreground font-bold border border-border">
                  {sourceNode}
                </span>
              </div>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-secondary border border-border focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer text-foreground"
              >
                {accounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {getNodeLabel(acc)} — {acc.account_name} ({acc.bank_name})
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Account Number & Running Balance */}
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" /> Account Number
              </span>
              <span className="font-mono font-semibold text-foreground">
                {currentAccount?.account_number || '****'}
              </span>
            </div>

            {transaction.running_balance !== null && transaction.running_balance !== undefined && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positive" /> Running Balance
                </span>
                <span className="font-bold text-foreground tabular-nums">
                  {formatCAD(transaction.running_balance)}
                </span>
              </div>
            )}

            {/* 7. Reference Number */}
            <div className="py-2 border-b border-border/50 flex items-center justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" /> Reference #
              </span>
              <input
                type="text"
                placeholder="Optional reference ID"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-48 px-2.5 py-1 text-xs rounded-xl bg-secondary border border-border focus:outline-none text-foreground font-mono text-right"
              />
            </div>

            {/* 8. Source File */}
            {transaction.source_file && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" /> Source File
                </span>
                <span className="font-mono text-muted-foreground text-right text-[11px]">
                  {transaction.source_file}
                </span>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Footer Actions - Sticky Bottom & Always Visible */}
        <div className="shrink-0 p-4 border-t border-border flex items-center justify-between gap-3 bg-card/95 backdrop-blur-md shadow-lg z-20">
          {confirmDelete ? (
            <div className="flex items-center gap-2 animate-in fade-in duration-200">
              <span className="text-xs font-bold text-negative flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Permanently delete?
              </span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border hover:bg-secondary transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDirectDelete}
                disabled={isDeleting}
                className="px-3 py-1 text-xs font-bold rounded-lg bg-negative hover:bg-negative/90 text-negative-foreground shadow-md shadow-negative/20 transition-all flex items-center gap-1 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                <span>{isDeleting ? 'Deleting...' : 'Confirm'}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl text-negative hover:bg-negative/10 border border-negative/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {isDirty && (
              <button
                type="button"
                onClick={() => {
                  // Reset back to original
                  if (transaction) {
                    setAmount(transaction.amount);
                    setAmountInput(Math.abs(transaction.amount).toFixed(2));
                    setDate(transaction.date);
                    setDescription(transaction.description || '');
                    setMerchant(transaction.merchant || '');
                    setType((transaction.type as any) || (transaction.amount > 0 ? 'Inflow' : 'Outflow'));
                    setStatus(transaction.status);
                    setAccountId(transaction.account_id);
                    setCategories(
                      transaction.category ? transaction.category.split(',').map((c) => c.trim()).filter(Boolean) : ['General']
                    );
                    setReferenceNumber(transaction.reference_number || '');
                    setIsEditingAmount(false);
                  }
                }}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-all cursor-pointer"
                title="Discard unsaved changes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition-all cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={() => handleSave()}
              disabled={isSaving || (!isDirty && saveStatus !== 'saved')}
              className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                isSaving
                  ? 'bg-primary/70 text-primary-foreground cursor-wait'
                  : isDirty
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer animate-pulse'
                  : saveStatus === 'saved'
                  ? 'bg-positive/20 text-positive border border-positive/40 cursor-default'
                  : 'bg-secondary text-muted-foreground opacity-60 cursor-default'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : isDirty ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                  <span>Saved to Database ✓</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
