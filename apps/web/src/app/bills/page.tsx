'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bill, formatCAD } from '@financeos/shared';
import {
  CalendarCheck,
  Plus,
  Home,
  CreditCard,
  Zap,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Clock,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

export default function BillsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'rent' | 'credit_card' | 'utility' | 'subscription' | 'other'>('utility');
  const [amountStr, setAmountStr] = useState('');
  const [dueDay, setDueDay] = useState('15');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'biweekly'>('monthly');
  const [autopay, setAutopay] = useState(false);
  const [nextDueDate, setNextDueDate] = useState('2026-11-15');
  const [notes, setNotes] = useState('');

  // 1. Fetch Bills
  const { data: billsData, isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      const res = await fetch('/api/bills');
      return res.json();
    },
  });

  // 2. Fetch Accounts to link
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
  });

  const bills: Bill[] = billsData?.bills || [];
  const accounts = accountsData?.accounts || [];

  // Add Bill Mutation
  const addBillMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Bill scheduled successfully!');
        queryClient.invalidateQueries({ queryKey: ['bills'] });
        setIsAddBillOpen(false);
        setName('');
        setAmountStr('');
        setNotes('');
      } else {
        toast.error(data.error || 'Failed to add bill');
      }
    },
  });

  // Mark Paid Mutation
  const payBillMutation = useMutation({
    mutationFn: async ({ id, createTx }: { id: string; createTx: boolean }) => {
      const res = await fetch(`/api/bills/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ create_transaction: createTx }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast.success('Bill marked as paid! Next due date advanced by 1 month.');
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  // Delete Bill Mutation
  const deleteBillMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      toast.success('Bill deleted');
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });

  const getBillIcon = (type: string) => {
    switch (type) {
      case 'rent':
        return <Home className="w-4 h-4 text-accent" />;
      case 'credit_card':
        return <CreditCard className="w-4 h-4 text-accent" />;
      case 'utility':
        return <Zap className="w-4 h-4 text-warning" />;
      case 'subscription':
        return <Sparkles className="w-4 h-4 text-accent" />;
      default:
        return <Calendar className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(amountStr);
    if (!parsedAmt || parsedAmt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    addBillMutation.mutate({
      name: name.trim(),
      type,
      amount: parsedAmt,
      due_day: parseInt(dueDay, 10) || 1,
      frequency,
      autopay,
      next_due_date: nextDueDate,
      notes: notes.trim() || null,
    });
  };

  const totalMonthlyCommitment = bills.reduce((acc, b) => acc + (b.frequency === 'monthly' ? b.amount : b.amount * 2), 0);

  // Generate Calendar Days (Current Month: 31 days)
  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            Bills & Automated Reminders
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {bills.length} Tracked
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-calculated credit card due dates (CIBC statement + 21 days), rent, utilities, and daily 9am cron alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* List / Calendar Toggle */}
          <div className="p-1 rounded-2xl bg-muted border border-border flex items-center text-xs font-semibold">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                viewMode === 'list' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                viewMode === 'calendar' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              Calendar View
            </button>
          </div>

          <button
            onClick={() => setIsAddBillOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bill</span>
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-card via-card to-accent/[0.04] border border-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase font-bold text-muted-foreground tracking-wider mb-1">
            <CalendarCheck className="w-4 h-4 text-accent" />
            <span>Monthly Fixed Commitments</span>
          </div>
          <div className="text-3xl font-black text-foreground">
            {formatCAD(totalMonthlyCommitment)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Includes Rent ($1,900), Mobile plans, Utilities, and active Credit Card statement balances
          </p>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/60 border border-border text-xs">
          <Bell className="w-4 h-4 text-primary shrink-0" />
          <div className="text-[11px] text-muted-foreground">
            <strong className="text-foreground">Daily 9:00 AM Cron:</strong> Checks bills due in 3 days, 1 day, and today.
          </div>
        </div>
      </div>

      {/* View Mode: Calendar */}
      {viewMode === 'calendar' ? (
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground">Monthly Payment Calendar</h3>
            <span className="text-xs text-muted-foreground font-semibold">October 2026</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center font-bold text-[11px] text-muted-foreground py-1">
                {d}
              </div>
            ))}
            {calendarDays.map((day) => {
              const matchingBills = bills.filter((b) => b.due_day === day);
              const hasDue = matchingBills.length > 0;
              return (
                <div
                  key={day}
                  className={`min-h-20 p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                    hasDue
                      ? 'border-primary/40 bg-primary/[0.03]'
                      : 'border-border/50 bg-muted/10'
                  }`}
                >
                  <span className="text-xs font-bold text-foreground">{day}</span>
                  <div className="space-y-1 my-1">
                    {matchingBills.map((b) => (
                      <div
                        key={b.id}
                        title={`${b.name} - ${formatCAD(b.amount)}`}
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-card border border-border shadow-xs truncate text-foreground"
                      >
                        {b.name} ({formatCAD(b.amount)})
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* View Mode: List */
        <div className="rounded-3xl bg-card border border-border/80 shadow-sm overflow-hidden divide-y divide-border/60">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading bills...</div>
          ) : bills.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No bills recorded yet.</div>
          ) : (
            bills.map((bill) => (
              <div
                key={bill.id}
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center shadow-xs shrink-0">
                    {getBillIcon(bill.type)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span>{bill.name}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.2 rounded-md bg-muted text-muted-foreground border border-border">
                        {bill.type}
                      </span>
                      {bill.autopay && (
                        <span className="text-[10px] font-semibold text-positive bg-positive/10 px-1.5 py-0.2 rounded border border-positive/20">
                          Autopay ON
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>Due on day {bill.due_day} of each month</span>
                      <span>•</span>
                      <span>Next Due: <strong>{bill.next_due_date}</strong></span>
                      {bill.notes && (
                        <>
                          <span>•</span>
                          <span className="italic">{bill.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <div className="text-sm font-black text-foreground">
                      {formatCAD(bill.amount)}
                    </div>
                    <span className="text-[10px] text-warning font-semibold block">
                      Scheduled
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        payBillMutation.mutate({ id: bill.id, createTx: true });
                      }}
                      disabled={payBillMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-positive/10 text-positive border border-positive/30 hover:bg-positive/20 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Paid</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete bill '${bill.name}'?`)) {
                          deleteBillMutation.mutate(bill.id);
                        }
                      }}
                      className="p-1.5 rounded-xl hover:bg-negative/10 text-muted-foreground hover:text-negative transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Bill Modal */}
      {isAddBillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAddBillOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Add Scheduled Bill</h3>
                <p className="text-xs text-muted-foreground">Track recurring monthly obligations and card statements</p>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Bill Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CIBC Dividend Visa Payment"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Category Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  >
                    <option value="rent">Rent / Housing</option>
                    <option value="credit_card">Credit Card Statement</option>
                    <option value="utility">Utility / Telecom</option>
                    <option value="subscription">Subscription</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Amount ($CAD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1900.00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Due Day of Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autopay"
                  checked={autopay}
                  onChange={(e) => setAutopay(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <label htmlFor="autopay" className="text-xs text-foreground cursor-pointer font-medium">
                  Autopay is enabled for this bill
                </label>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via e-Transfer"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddBillOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addBillMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/25 disabled:opacity-50"
                >
                  {addBillMutation.isPending ? 'Saving...' : 'Save Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
