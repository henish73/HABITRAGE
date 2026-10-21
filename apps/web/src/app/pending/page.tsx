'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Transaction, formatCAD } from '@financeos/shared';
import { useFinanceStore } from '@/lib/store';
import {
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  Plus,
  AlertCircle,
  Building2,
  Tag,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PendingPage() {
  const queryClient = useQueryClient();
  const { openAddTransaction } = useFinanceStore();

  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['transactions', 'pending'],
    queryFn: async () => {
      const res = await fetch('/api/transactions?status=pending&limit=100');
      return res.json();
    },
  });

  const transactions: Transaction[] = pendingData?.transactions || [];

  // Approve Mutation -> marks posted and recalcs running balance!
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'posted' }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Transaction approved and posted to ledger! Running balances updated.');
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
      } else {
        toast.error(data.error || 'Failed to approve transaction');
      }
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      toast.success('Pending transaction deleted');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const totalPendingAmount = transactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            Pending Authorizations
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/25">
              {transactions.length} Active Holds
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pending transactions do not alter your posted running ledger balance until approved.
          </p>
        </div>

        <button
          onClick={openAddTransaction}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/25"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Pending Item</span>
        </button>
      </div>

      {/* Info Card */}
      <div className="p-5 rounded-3xl bg-warning/[0.06] border border-warning/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">
              Total Pending Holds: {formatCAD(totalPendingAmount, true)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Temporary holds typically settle within 1 to 3 business days.
            </div>
          </div>
        </div>

        {transactions.length > 0 && (
          <button
            onClick={() => {
              if (confirm(`Approve all ${transactions.length} pending transactions and post to ledger?`)) {
                Promise.all(transactions.map((t) => approveMutation.mutateAsync(t.id)));
              }
            }}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-positive text-positive-foreground hover:bg-positive/90 transition-all shadow-sm"
          >
            Approve All ({transactions.length})
          </button>
        )}
      </div>

      {/* Pending Items List */}
      <div className="rounded-3xl bg-card border border-border/80 shadow-sm overflow-hidden divide-y divide-border/60">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Loading pending transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-positive" />
            <div className="text-sm font-bold text-foreground">All Clear</div>
            <p className="text-xs">No pending authorizations or holds currently awaiting clearance.</p>
          </div>
        ) : (
          transactions.map((tx) => {
            const isExpense = tx.amount < 0;
            return (
              <div
                key={tx.id}
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isExpense ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'
                    }`}
                  >
                    {isExpense ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      {tx.merchant || tx.description}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span>{tx.date}</span>
                      <span>•</span>
                      <span>{tx.account?.account_name}</span>
                      <span>•</span>
                      <span className="text-primary font-medium">{tx.category}</span>
                      {tx.reference_number && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-muted-foreground">{tx.reference_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <div
                      className={`text-sm font-black ${
                        isExpense ? 'text-negative' : 'text-positive'
                      }`}
                    >
                      {formatCAD(tx.amount, true)}
                    </div>
                    <span className="text-[10px] text-warning font-semibold block">
                      Pending Hold
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approveMutation.mutate(tx.id)}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-positive/10 text-positive border border-positive/30 hover:bg-positive/20 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Post</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this pending transaction?')) {
                          deleteMutation.mutate(tx.id);
                        }
                      }}
                      className="p-1.5 rounded-xl hover:bg-negative/10 text-muted-foreground hover:text-negative transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
