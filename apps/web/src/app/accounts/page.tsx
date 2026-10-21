'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Account, formatCAD, Transaction } from '@financeos/shared';
import { useFinanceStore } from '@/lib/store';
import {
  Landmark,
  CreditCard,
  Plus,
  Link as LinkIcon,
  TrendingUp,
  ShieldCheck,
  X,
  Trash2,
  Edit2,
  Calendar,
  DollarSign,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';

export default function AccountsPage() {
  const { isMasked, openPlaidModal } = useFinanceStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'bank' | 'credit_card'>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  // New account form state
  const [newBankName, setNewBankName] = useState('CIBC');
  const [newAcctName, setNewAcctName] = useState('');
  const [newAcctType, setNewAcctType] = useState('bank');
  const [newSubtype, setNewSubtype] = useState('Chequing');
  const [newAcctNum, setNewAcctNum] = useState('');
  const [newBalance, setNewBalance] = useState('0.00');
  const [newCreditLimit, setNewCreditLimit] = useState('');

  // Instrument Modal Tab & Edit Form State
  const [modalTab, setModalTab] = useState<'form' | 'analytics'>('form');
  const [editBalance, setEditBalance] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState('');
  const [editStatementStart, setEditStatementStart] = useState('');
  const [editStatementClosing, setEditStatementClosing] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editMinimumPayment, setEditMinimumPayment] = useState('');
  const [editInstallmentMonthly, setEditInstallmentMonthly] = useState('');
  const [editInstallmentRemaining, setEditInstallmentRemaining] = useState('');
  const [editInstallmentNotes, setEditInstallmentNotes] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // 1. Fetch Accounts
  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
  });

  // 2. Fetch Selected Account Details if open
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['account-detail', selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) return null;
      const res = await fetch(`/api/accounts/${selectedAccountId}`);
      return res.json();
    },
    enabled: !!selectedAccountId,
  });

  // Mutation to Add Account
  const addAccountMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Account added successfully!');
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        setIsAddAccountOpen(false);
        setNewAcctName('');
        setNewAcctNum('');
        setNewBalance('0.00');
        setNewCreditLimit('');
      } else {
        toast.error(data.error || 'Failed to add account');
      }
    },
  });

  // Mutation to Delete Account
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Account deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        setSelectedAccountId(null);
      }
    },
  });

  // Mutation to Update Account & Statement details
  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Account> }) => {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Instrument details & statement terms updated!');
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['account-detail', selectedAccountId] });
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      } else {
        toast.error(data.error || 'Failed to update account');
      }
    },
  });

  const accounts: Account[] = accountsData?.accounts || [];

  const filteredAccounts = accounts.filter((a) => {
    if (activeTab === 'all') return true;
    return a.type === activeTab;
  });

  const bankAccounts = accounts.filter((a) => a.type === 'bank');
  const creditCards = accounts.filter((a) => a.type === 'credit_card');

  const getBankBadge = (bank: string) => {
    switch (bank) {
      case 'CIBC':
        return { bg: 'bg-red-600', text: 'text-white' };
      case 'TD':
        return { bg: 'bg-emerald-600', text: 'text-white' };
      case 'RBC':
        return { bg: 'bg-blue-600', text: 'text-white' };
      case 'Rogers Bank':
        return { bg: 'bg-red-700', text: 'text-white' };
      case 'American Express':
        return { bg: 'bg-cyan-800', text: 'text-white' };
      default:
        return { bg: 'bg-slate-700', text: 'text-white' };
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAccountMutation.mutate({
      type: newAcctType,
      bank_name: newBankName,
      account_name: newAcctName,
      account_number: newAcctNum || '****0000',
      account_type: newSubtype,
      balance: parseFloat(newBalance) || 0,
      credit_limit: newAcctType === 'credit_card' ? parseFloat(newCreditLimit) || 1000 : null,
    });
  };

  const selectedAccount: Account | null = detailData?.account || null;
  const balanceTrend = detailData?.balanceTrend || [];
  const recentTransactions: Transaction[] = detailData?.recentTransactions || [];

  React.useEffect(() => {
    if (selectedAccount) {
      setEditBalance(selectedAccount.balance !== undefined ? selectedAccount.balance.toString() : '0');
      setEditCreditLimit(selectedAccount.credit_limit ? selectedAccount.credit_limit.toString() : '');
      setEditStatementStart(selectedAccount.statement_start_date || '2026-09-22');
      setEditStatementClosing(selectedAccount.statement_closing_date || '2026-10-21');
      setEditDueDate(selectedAccount.due_date || (selectedAccount.bank_name.toLowerCase().includes('cibc') ? '2026-10-21' : '2026-10-28'));
      setEditMinimumPayment(
        selectedAccount.minimum_payment !== null && selectedAccount.minimum_payment !== undefined
          ? selectedAccount.minimum_payment.toString()
          : selectedAccount.balance > 0
          ? (Math.max(10, Math.round(selectedAccount.balance * 0.03 * 100) / 100)).toString()
          : '0'
      );
      setEditInstallmentMonthly(selectedAccount.installment_plan_monthly ? selectedAccount.installment_plan_monthly.toString() : '');
      setEditInstallmentRemaining(selectedAccount.installment_plan_remaining ? selectedAccount.installment_plan_remaining.toString() : '');
      setEditInstallmentNotes(selectedAccount.installment_plan_notes || '');
      setEditNotes(selectedAccount.notes || '');
    }
  }, [selectedAccount]);

  const handleUpdateInstrument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    updateAccountMutation.mutate({
      id: selectedAccount.id,
      data: {
        balance: parseFloat(editBalance) || 0,
        credit_limit: editCreditLimit ? parseFloat(editCreditLimit) : null,
        statement_start_date: editStatementStart || null,
        statement_closing_date: editStatementClosing || null,
        due_date: editDueDate || null,
        minimum_payment: editMinimumPayment ? parseFloat(editMinimumPayment) : null,
        installment_plan_monthly: editInstallmentMonthly ? parseFloat(editInstallmentMonthly) : null,
        installment_plan_remaining: editInstallmentRemaining ? parseFloat(editInstallmentRemaining) : null,
        installment_plan_notes: editInstallmentNotes || null,
        notes: editNotes || null,
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Accounts & Portfolios
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your 7 Bank Accounts and 6 Credit Cards in $CAD
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openPlaidModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Connect Bank</span>
          </button>
          <button
            onClick={() => setIsAddAccountOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-muted/60 border border-border w-fit text-xs font-semibold">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-1.5 rounded-xl transition-all ${
            activeTab === 'all' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Accounts ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`px-4 py-1.5 rounded-xl transition-all ${
            activeTab === 'bank' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Bank Accounts ({bankAccounts.length})
        </button>
        <button
          onClick={() => setActiveTab('credit_card')}
          className={`px-4 py-1.5 rounded-xl transition-all ${
            activeTab === 'credit_card' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Credit Cards ({creditCards.length})
        </button>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAccounts.map((acc) => {
          const badge = getBankBadge(acc.bank_name);
          const isCC = acc.type === 'credit_card';
          const utilPct =
            isCC && acc.credit_limit && acc.credit_limit > 0
              ? Math.min(100, Math.round(((acc.balance || 0) / acc.credit_limit) * 100))
              : 0;

          return (
            <div
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm hover:shadow-lg hover:border-primary/40 cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl ${badge.bg} ${badge.text} flex items-center justify-center font-bold text-xs shadow-sm`}
                    >
                      {acc.bank_name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {acc.account_name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {isMasked ? acc.account_number : acc.account_number.replace('****', '4505-****-')}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                    {acc.account_type}
                  </span>
                </div>

                <div className="my-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    {isCC ? 'Current Debt' : 'Cash Balance'}
                  </span>
                  <div
                    className={`text-2xl font-black tracking-tight ${
                      isCC && (acc.balance || 0) > 0 ? 'text-negative' : 'text-foreground'
                    }`}
                  >
                    {formatCAD(acc.balance)}
                  </div>
                </div>
              </div>

              {isCC && acc.credit_limit ? (
                <div className="pt-3 border-t border-border/60 mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Limit: <strong>{formatCAD(acc.credit_limit)}</strong>
                    </span>
                    <span
                      className={`font-bold ${
                        utilPct > 50 ? 'text-negative' : utilPct > 30 ? 'text-warning' : 'text-positive'
                      }`}
                    >
                      {utilPct}% Util
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        utilPct > 50 ? 'bg-negative' : utilPct > 30 ? 'bg-warning' : 'bg-positive'
                      }`}
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-border/60 mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Canadian Bank Account</span>
                  <span className="text-positive font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> CDIC Insured
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Account Detail Modal / Trend View */}
      {selectedAccountId && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-3xl max-h-[90vh] rounded-3xl border border-border shadow-2xl p-6 relative overflow-y-auto">
            <button
              onClick={() => setSelectedAccountId(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`w-12 h-12 rounded-2xl ${getBankBadge(selectedAccount.bank_name).bg} text-white flex items-center justify-center font-bold text-sm shadow-md`}
              >
                {selectedAccount.bank_name.slice(0, 2)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {selectedAccount.account_name}
                </h3>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{selectedAccount.bank_name}</span>
                  <span>•</span>
                  <span className="font-mono">{selectedAccount.account_number}</span>
                  <span>•</span>
                  <span>{detailData?.transactionCount || 0} Transactions</span>
                </div>
              </div>
            </div>

            {/* Sub-Tabs: Form vs Analytics */}
            <div className="flex items-center gap-2 mb-5 p-1 bg-muted/60 rounded-2xl border border-border">
              <button
                type="button"
                onClick={() => setModalTab('form')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  modalTab === 'form' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Statement Terms & Balance Adjustment
              </button>
              <button
                type="button"
                onClick={() => setModalTab('analytics')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  modalTab === 'analytics' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ledger Trend & Recent Transactions
              </button>
            </div>

            {modalTab === 'form' ? (
              /* Instrument Statement & Balance Edit Form */
              <form onSubmit={handleUpdateInstrument} className="space-y-4 text-xs">
                {/* Balance & Limits Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/20 border border-border/80">
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      {selectedAccount.type === 'credit_card' ? 'Current Debt / Balance ($CAD)' : 'Account Balance ($CAD)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editBalance}
                        onChange={(e) => setEditBalance(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 text-xs font-semibold rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      You can manually overwrite or adjust this balance anytime.
                    </p>
                  </div>

                  {selectedAccount.type === 'credit_card' && (
                    <div>
                      <label className="text-[11px] font-bold text-foreground block mb-1">
                        Credit Limit ($CAD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                        <input
                          type="number"
                          step="100"
                          value={editCreditLimit}
                          onChange={(e) => setEditCreditLimit(e.target.value)}
                          placeholder="3500.00"
                          className="w-full pl-7 pr-3 py-2 text-xs font-semibold rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Total revolving credit authorized by issuer.
                      </p>
                    </div>
                  )}
                </div>

                {/* Statement & Due Dates Row */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Billing Cycle & Payment Timelines
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Cycle Start Date
                      </label>
                      <input
                        type="date"
                        value={editStatementStart}
                        onChange={(e) => setEditStatementStart(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Statement Closing Date
                      </label>
                      <input
                        type="date"
                        value={editStatementClosing}
                        onChange={(e) => setEditStatementClosing(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Payment Due Date
                      </label>
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Minimum Payment Required ($CAD)
                    </label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editMinimumPayment}
                        onChange={(e) => setEditMinimumPayment(e.target.value)}
                        placeholder="10.00"
                        className="w-full pl-7 pr-3 py-2 text-xs font-semibold rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Installments & Plan It Section */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-warning" />
                    Installment Plans / Plan It / Pay-Over-Time
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Monthly Installment Charge ($CAD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editInstallmentMonthly}
                        onChange={(e) => setEditInstallmentMonthly(e.target.value)}
                        placeholder="e.g. 45.00"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Remaining Principal Balance ($CAD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editInstallmentRemaining}
                        onChange={(e) => setEditInstallmentRemaining(e.target.value)}
                        placeholder="e.g. 540.00"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Plan Description & Installment Schedule
                    </label>
                    <input
                      type="text"
                      value={editInstallmentNotes}
                      onChange={(e) => setEditInstallmentNotes(e.target.value)}
                      placeholder="e.g. iPhone 15 Pro - 12 of 24 months remaining (0% APR)"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Internal Notes & Account Details
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Interest rates, cash back perks, annual fee waiver dates..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                {/* Form Submit Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updateAccountMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{updateAccountMutation.isPending ? 'Saving...' : 'Save & Update Instrument'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Analytics & Trend Tab */
              <div className="space-y-6">
                {/* Balance Trend Line */}
                {balanceTrend.length > 1 && (
                  <div className="p-5 rounded-2xl bg-muted/30 border border-border/80">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Running Balance Trend</h4>
                        <p className="text-[11px] text-muted-foreground">Chronological ledger progression</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Current
                        </span>
                        <span className="text-sm font-black text-foreground">
                          {formatCAD(selectedAccount.balance)}
                        </span>
                      </div>
                    </div>

                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={balanceTrend.slice(-60)}>
                          <defs>
                            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
                          <Tooltip formatter={(val: any) => [formatCAD(val), 'Balance']} />
                          <Area type="monotone" dataKey="balance" stroke="hsl(var(--accent))" strokeWidth={2} fillOpacity={1} fill="url(#trendGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Account Transactions List */}
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-3">Recent Transactions</h4>
                  <div className="divide-y divide-border/60 max-h-60 overflow-y-auto pr-1">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              tx.amount < 0 ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'
                            }`}
                          >
                            {tx.amount < 0 ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{tx.merchant || tx.description}</div>
                            <div className="text-[11px] text-muted-foreground">{tx.date}</div>
                          </div>
                        </div>
                        <div className={`font-bold ${tx.amount < 0 ? 'text-negative' : 'text-positive'}`}>
                          {formatCAD(tx.amount, true)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-5 border-t border-border mt-6">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this account and all its transactions?')) {
                    deleteAccountMutation.mutate(selectedAccount.id);
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-negative hover:bg-negative/10 px-3 py-1.5 rounded-xl border border-negative/20 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
              <button
                onClick={() => setSelectedAccountId(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAddAccountOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Add Financial Account</h3>
                <p className="text-xs text-muted-foreground">Add a new bank account or credit line</p>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Instrument Type
                </label>
                <div className="grid grid-cols-2 p-1 rounded-xl bg-muted border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setNewAcctType('bank');
                      setNewSubtype('Chequing');
                    }}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      newAcctType === 'bank' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    Bank Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewAcctType('credit_card');
                      setNewSubtype('Credit Card');
                    }}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      newAcctType === 'credit_card' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    Credit Card
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Bank / Issuer
                  </label>
                  <select
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  >
                    <option value="CIBC">CIBC</option>
                    <option value="TD">TD Bank</option>
                    <option value="RBC">RBC Royal Bank</option>
                    <option value="Rogers Bank">Rogers Bank</option>
                    <option value="American Express">American Express</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Account Type / Product
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chequing / Visa"
                    value={newSubtype}
                    onChange={(e) => setNewSubtype(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CIBC Smart Account"
                  value={newAcctName}
                  onChange={(e) => setNewAcctName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Account Number (Masked)
                  </label>
                  <input
                    type="text"
                    placeholder="****1234"
                    value={newAcctNum}
                    onChange={(e) => setNewAcctNum(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Initial Balance ($CAD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              {newAcctType === 'credit_card' && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Credit Limit ($CAD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="3500.00"
                    value={newCreditLimit}
                    onChange={(e) => setNewCreditLimit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addAccountMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/25 disabled:opacity-50"
                >
                  {addAccountMutation.isPending ? 'Adding...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
