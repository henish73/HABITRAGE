'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFinanceStore } from '@/lib/store';
import { Transaction, formatCAD } from '@financeos/shared';
import { TransactionDrawer } from '@/components/transactions/TransactionDrawer';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Tag,
  ArrowUpDown,
  Download,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper to pick monogram and color
function getMerchantBadge(merchant: string, category: string) {
  const m = (merchant || '').trim().toUpperCase();
  let char = m[0] || '•';
  if (category?.toLowerCase().includes('transfer') || m.includes('TRANSFER') || m.includes('PAYMENT')) {
    char = '⇄';
  } else if (category?.toLowerCase().includes('fee') || m.includes('FEE')) {
    char = '$';
  }

  // Deterministic color palette
  const colors = [
    '#2F6BB3', '#B5577F', '#14968A', '#8C7B55', '#7A5BB5',
    '#2B5C8A', '#2C7A4B', '#9B2F2F', '#B8770A', '#0E8A78'
  ];
  let hash = 0;
  for (let i = 0; i < m.length; i++) hash = m.charCodeAt(i) + ((hash << 5) - hash);
  const color = colors[Math.abs(hash) % colors.length];

  return { char, color };
}

function ActivityContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { isMasked } = useFinanceStore();

  const querySearch = searchParams.get('search') || '';
  const queryTab = searchParams.get('tab');
  const initialTab = (queryTab === 'pending' || queryTab === 'review') ? queryTab : 'all';

  const [activeTab, setActiveTab] = useState<'all' | 'review' | 'pending'>(initialTab);
  const [searchQuery, setSearchQuery] = useState(querySearch);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [limit, setLimit] = useState(500);

  // Sync state if URL search query changes
  useEffect(() => {
    if (querySearch) setSearchQuery(querySearch);
    if (queryTab === 'pending' || queryTab === 'review') setActiveTab(queryTab);
  }, [querySearch, queryTab]);

  // Fetch transactions from API
  const { data: txData, isLoading } = useQuery({
    queryKey: ['transactions', 'activity', limit],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?limit=${limit}&sort_by=date&sort_order=desc`);
      return res.json();
    },
  });


  // Fetch accounts to map account names
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
  });

  const accountsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (accountsData?.accounts) {
      for (const a of accountsData.accounts) {
        map.set(a.id, a.account_name);
      }
    }
    return map;
  }, [accountsData]);

  const allTransactions: Transaction[] = txData?.transactions || [];

  // Filter based on active tab and search
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      // Tab filter
      if (activeTab === 'pending' && tx.status !== 'pending') return false;
      if (activeTab === 'review') {
        const desc = (tx.description || '').toLowerCase();
        const cat = (tx.category || '').toLowerCase();
        // Items to review: refunds, ambiguous transfers, or uncategorized
        const isAnomalous =
          cat.includes('misc') ||
          cat.includes('general') ||
          (tx.amount > 0 && !cat.includes('income') && !cat.includes('transfer')) ||
          desc.includes('refund') ||
          desc.includes('cash back');
        if (!isAnomalous) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const m = (tx.merchant || '').toLowerCase();
        const d = (tx.description || '').toLowerCase();
        const c = (tx.category || '').toLowerCase();
        return m.includes(query) || d.includes(query) || c.includes(query);
      }

      return true;
    });
  }, [allTransactions, activeTab, searchQuery]);

  // Group filtered transactions by day
  const groupedByDay = useMemo(() => {
    const groups: { date: string; dateLabel: string; dayTotal: number; items: Transaction[] }[] = [];
    const dateMap = new Map<string, Transaction[]>();

    for (const tx of filteredTransactions) {
      const d = tx.date || 'Unknown Date';
      if (!dateMap.has(d)) dateMap.set(d, []);
      dateMap.get(d)!.push(tx);
    }

    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));

    for (const d of sortedDates) {
      const items = dateMap.get(d)!;
      let dayTotal = 0;
      for (const t of items) {
        // Only posted count toward total
        if (t.status === 'posted') {
          dayTotal += t.amount;
        }
      }

      // Format date nicely (e.g. "Today · Oct 16" or "Oct 15, 2026")
      let dateLabel = d;
      try {
        const parsed = new Date(d + 'T12:00:00Z');
        dateLabel = parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } catch {}

      groups.push({
        date: d,
        dateLabel,
        dayTotal: Math.round(dayTotal * 100) / 100,
        items,
      });
    }

    return groups;
  }, [filteredTransactions]);

  const handleExport = () => {
    window.location.href = '/api/export?format=all';
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
            Activity
          </h1>
          <p className="text-xs text-[var(--muted-color)] mt-0.5">
            Indexed ledger grouped by day with category review queue
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-xs font-semibold text-[var(--ink)] transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--muted-color)]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Segmented Controls & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[var(--surface)] p-2 rounded-2xl border border-[var(--line)] shadow-vault">
        {/* Segmented Tabs (All / To review / Pending) */}
        <div className="flex items-center gap-1 bg-[var(--raised)] p-1 rounded-xl border border-[var(--line-soft)]">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              activeTab === 'all'
                ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted-color)] hover:text-[var(--ink)]'
            )}
          >
            All Activity
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeTab === 'review'
                ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted-color)] hover:text-[var(--ink)]'
            )}
          >
            <span>To review</span>
            <span className="w-4 h-4 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] text-[10px] grid place-items-center font-bold">
              14
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              activeTab === 'pending'
                ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted-color)] hover:text-[var(--ink)]'
            )}
          >
            Pending Holds
          </button>
        </div>

        {/* Live Filter Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter merchant, category, notes…"
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-[var(--raised)] border border-[var(--line-soft)] text-xs text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>
      </div>

      {/* Ledger Feed */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4 sm:p-6 shadow-vault">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[var(--muted-color)]">
            Loading ledger transactions…
          </div>
        ) : groupedByDay.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-[var(--teal)]" />
            <b className="text-sm font-semibold text-[var(--ink)]">No transactions found</b>
            <p className="text-xs text-[var(--muted-color)]">
              {activeTab === 'review'
                ? 'All transactions have been reviewed and categorized!'
                : 'Try adjusting your search filter.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--line-soft)]">
            {groupedByDay.map((group) => {
              const isPositive = group.dayTotal > 0;
              return (
                <div key={group.date} className="pt-4 first:pt-0">
                  {/* Day Header */}
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)] pb-2">
                    <span>{group.dateLabel}</span>
                    <span className={cn(
                      "font-mono font-semibold",
                      isPositive ? "text-[var(--pos)]" : "text-[var(--ink)]",
                      isMasked && "blurnum"
                    )}>
                      {isPositive ? `+${formatCAD(group.dayTotal)}` : `−${formatCAD(Math.abs(group.dayTotal))}`}
                    </span>
                  </div>

                  {/* Day Rows */}
                  <div className="flex flex-col">
                    {group.items.map((tx) => {
                      const { char, color } = getMerchantBadge(tx.merchant || tx.description, tx.category);
                      const isPending = tx.status === 'pending';
                      const isIncome = tx.amount > 0;
                      const accountName = accountsMap.get(tx.account_id) || 'Account';

                      return (
                        <div
                          key={tx.id}
                          onClick={() => setSelectedTx(tx)}
                          className="grid grid-cols-[36px_1fr_auto] gap-3 items-center py-2.5 px-2 -mx-2 rounded-xl hover:bg-[var(--raised)] transition-colors cursor-pointer group"
                        >
                          {/* Monogram Badge */}
                          <span
                            className="w-9 h-9 rounded-[10px] grid place-items-center font-bold text-xs text-white shrink-0 shadow-xs"
                            style={{ background: color }}
                          >
                            {char}
                          </span>

                          {/* Merchant Title & Subtitle */}
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <b className="text-xs sm:text-sm font-semibold text-[var(--ink)] truncate group-hover:text-[var(--teal)] transition-colors">
                                {tx.merchant || tx.description}
                              </b>
                              {isPending && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--warn-soft)] text-[var(--warn)]">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>Pending</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--muted-color)] truncate mt-0.5">
                              <span>{tx.category || 'General'}</span>
                              <span>·</span>
                              <span className="truncate">{accountName}</span>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="text-right">
                            <span className={cn(
                              "font-mono font-semibold text-xs sm:text-sm block",
                              isIncome ? "text-[var(--pos)]" : "text-[var(--ink)]",
                              isMasked && "blurnum"
                            )}>
                              {isIncome ? `+${formatCAD(tx.amount)}` : `−${formatCAD(Math.abs(tx.amount))}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Slide-over Sheet */}
      {selectedTx && (
        <TransactionDrawer
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
          }}
          onDelete={() => {
            setSelectedTx(null);
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
          }}
        />
      )}
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--muted-color)] text-sm">Loading activity ledger...</div>}>
      <ActivityContent />
    </Suspense>
  );
}
