'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useFinanceStore } from '@/lib/store';
import { Transaction, formatCAD } from '@financeos/shared';
import { TransactionDrawer } from '@/components/transactions/TransactionDrawer';
import { CsvImportDialog } from '@/components/transactions/CsvImportDialog';
import { CategoryManagerDialog } from '@/components/transactions/CategoryManagerDialog';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Download,
  Upload,
  Trash2,
  CheckSquare,
  Square,
  Layers,
  FolderEdit,
  Printer,
  Calendar,
  RotateCcw,
  SlidersHorizontal,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity as ActivityIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { presetRange, normalizeRange, type DatePreset } from '@/lib/dates';
import { toast } from 'sonner';

// Helper to pick monogram and color
function getMerchantBadge(merchant: string, category: string) {
  const m = (merchant || '').trim().toUpperCase();
  let char = m[0] || '•';
  if (category?.toLowerCase().includes('transfer') || m.includes('TRANSFER') || m.includes('PAYMENT')) {
    char = '⇄';
  } else if (category?.toLowerCase().includes('fee') || m.includes('FEE')) {
    char = '$';
  }

  const colors = [
    '#2F6BB3', '#B5577F', '#14968A', '#8C7B55', '#7A5BB5',
    '#2B5C8A', '#2C7A4B', '#9B2F2F', '#B8770A', '#0E8A78',
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

  // Primary navigation tab
  const [activeTab, setActiveTab] = useState<'all' | 'review' | 'pending'>(initialTab);
  const [searchQuery, setSearchQuery] = useState(querySearch);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFilters, setShowFilters] = useState<boolean>(true);

  // Bulk edit state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllMatchingSelected, setIsAllMatchingSelected] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkType, setBulkType] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Sync state if URL search query changes
  useEffect(() => {
    if (querySearch) setSearchQuery(querySearch);
    if (queryTab === 'pending' || queryTab === 'review') setActiveTab(queryTab);
  }, [querySearch, queryTab]);

  // Clear selections when filters change
  useEffect(() => {
    setSelectedIds(new Set());
    setIsAllMatchingSelected(false);
  }, [
    activeTab,
    selectedCategory,
    selectedAccount,
    selectedType,
    selectedStatus,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    sortBy,
    sortOrder,
  ]);

  // Wait until typing pauses before searching
  const [debouncedSearch, setDebouncedSearch] = useState(querySearch);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setSelectedIds(new Set());
      setIsAllMatchingSelected(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const PAGE_SIZE = 200;

  // The filters as a query string. The list, CSV export and printable report all use this,
  // so what you see on screen is exactly what you download or print.
  const buildFilterQuery = () => {
    const params = new URLSearchParams();
    const range = normalizeRange(dateFrom, dateTo);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (activeTab === 'pending') params.set('status', 'pending');
    else if (activeTab === 'review') params.set('needs_review', 'true');
    else if (selectedStatus !== 'all') params.set('status', selectedStatus);
    if (selectedCategory !== 'all') params.set('categories', selectedCategory);
    if (selectedAccount !== 'all') params.set('account_ids', selectedAccount);
    if (selectedType !== 'all') params.set('type', selectedType);
    if (range.from) params.set('date_from', range.from);
    if (range.to) params.set('date_to', range.to);
    if (amountMin) params.set('amount_min', amountMin);
    if (amountMax) params.set('amount_max', amountMax);
    params.set('sort_by', sortBy);
    params.set('sort_order', sortOrder);
    return params;
  };

  // Query transactions with infinite pagination and all filter parameters
  const {
    data: txData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      'transactions',
      'activity',
      debouncedSearch,
      activeTab,
      selectedCategory,
      selectedAccount,
      selectedType,
      selectedStatus,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      sortBy,
      sortOrder,
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = buildFilterQuery();
      params.set('page', String(pageParam));
      params.set('limit', String(PAGE_SIZE));
      const res = await fetch(`/api/transactions?${params}`);
      if (!res.ok) throw new Error('Could not load transactions');
      return res.json();
    },
    getNextPageParam: (last: any) => (last?.page < last?.totalPages ? last.page + 1 : undefined),
  });

  const { data: reviewData } = useQuery({
    queryKey: ['transactions', 'review-count'],
    queryFn: async () => (await fetch('/api/transactions?needs_review=true&limit=1')).json(),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'with-counts'],
    queryFn: async () => (await fetch('/api/categories?withCounts=true')).json(),
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

  const allTransactions: Transaction[] = useMemo(
    () => (txData?.pages ?? []).flatMap((p: any) => p?.transactions ?? []),
    [txData]
  );

  // Financial summary numbers calculated across all filtered transactions on the server
  const firstPage = txData?.pages?.[0] as any;
  const totalMatching: number = firstPage?.total ?? 0;
  const totalInflow: number = firstPage?.totalInflow ?? 0;
  const totalOutflow: number = firstPage?.totalOutflow ?? 0;
  const netCashFlow: number = firstPage?.netCashFlow ?? 0;
  const aggregateVolume: number = Number((totalInflow + totalOutflow).toFixed(2));

  const filteredTransactions = allTransactions;
  const reviewCount: number = reviewData?.total ?? 0;

  // Categories across the whole ledger
  const categoriesList: { name: string; count: number }[] = useMemo(
    () =>
      ((categoriesData?.categories as any[]) ?? [])
        .map((c) => ({ name: c.name as string, count: Number(c.count) || 0 }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count),
    [categoriesData]
  );

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    selectedCategory !== 'all' ||
    selectedAccount !== 'all' ||
    selectedType !== 'all' ||
    selectedStatus !== 'all' ||
    dateFrom ||
    dateTo ||
    amountMin ||
    amountMax ||
    debouncedSearch ||
    activeTab !== 'all' ||
    sortBy !== 'date' ||
    sortOrder !== 'desc'
  );

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
        if (t.status === 'posted') {
          dayTotal += t.amount;
        }
      }

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

  // Date preset handler
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'custom') {
      // Keep whatever dates are already in the pickers.
    } else {
      const { from, to } = presetRange(preset as DatePreset);
      setDateFrom(from);
      setDateTo(to);
    }
  };

  // Multi-select helpers
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAllMatchingSelected(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllOnPage = () => {
    if (isAllMatchingSelected || selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
      setIsAllMatchingSelected(false);
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
      setIsAllMatchingSelected(false);
    }
  };

  // Helper to compile current filter parameters
  const getActiveFilterParams = () => {
    const p: any = {};
    if (debouncedSearch) p.search = debouncedSearch;
    if (activeTab === 'pending') p.status = 'pending';
    else if (activeTab === 'review') p.needs_review = true;
    else if (selectedStatus !== 'all') p.status = selectedStatus;

    if (selectedCategory !== 'all') p.categories = [selectedCategory];
    if (selectedAccount !== 'all') p.account_ids = [selectedAccount];
    if (selectedType !== 'all') p.type = selectedType;
    const range = normalizeRange(dateFrom, dateTo);
    if (range.from) p.date_from = range.from;
    if (range.to) p.date_to = range.to;
    if (amountMin) p.amount_min = Number(amountMin);
    if (amountMax) p.amount_max = Number(amountMax);
    return p;
  };

  const refreshLedger = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['forecast'] });
  };

  // Bulk update category
  const handleBulkUpdateCategory = async (cat: string) => {
    if ((selectedIds.size === 0 && !isAllMatchingSelected) || !cat) return;
    setIsBulkProcessing(true);
    try {
      const payload: any = { action: 'update', category: cat };
      if (isAllMatchingSelected) {
        payload.all_matching = true;
        payload.filters = getActiveFilterParams();
        payload.expected_count = totalMatching;
      } else {
        payload.ids = Array.from(selectedIds);
      }
      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk update failed');
      const count = data.count ?? (isAllMatchingSelected ? totalMatching : selectedIds.size);
      toast.success(`Updated category to "${cat}" for ${count} transactions.`);
      setSelectedIds(new Set());
      setIsAllMatchingSelected(false);
      setBulkCategory('');
      refreshLedger();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update transactions.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk update type (Inflow, Outflow, Transfers)
  const handleBulkUpdateType = async (type: 'Inflow' | 'Outflow' | 'Transfers') => {
    if ((selectedIds.size === 0 && !isAllMatchingSelected) || !type) return;
    const count = isAllMatchingSelected ? totalMatching : selectedIds.size;
    if (
      type !== 'Transfers' &&
      !confirm(
        `Mark ${count.toLocaleString()} transaction${count === 1 ? '' : 's'} as ${type}?\n\n` +
          `Amounts are made ${type === 'Inflow' ? 'positive' : 'negative'} where needed, which changes account balances.`
      )
    ) {
      setBulkType('');
      return;
    }
    setIsBulkProcessing(true);
    try {
      const payload: any = { action: 'update', type };
      if (isAllMatchingSelected) {
        payload.all_matching = true;
        payload.filters = getActiveFilterParams();
        payload.expected_count = totalMatching;
      } else {
        payload.ids = Array.from(selectedIds);
      }
      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk update failed');
      const count = data.count ?? (isAllMatchingSelected ? totalMatching : selectedIds.size);
      toast.success(`Updated type to "${type}" for ${count} transactions.`);
      setSelectedIds(new Set());
      setIsAllMatchingSelected(false);
      setBulkType('');
      refreshLedger();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update transaction types.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk update status (posted, pending)
  const handleBulkUpdateStatus = async (status: 'posted' | 'pending') => {
    if ((selectedIds.size === 0 && !isAllMatchingSelected) || !status) return;
    setIsBulkProcessing(true);
    try {
      const payload: any = { action: 'update', status };
      if (isAllMatchingSelected) {
        payload.all_matching = true;
        payload.filters = getActiveFilterParams();
        payload.expected_count = totalMatching;
      } else {
        payload.ids = Array.from(selectedIds);
      }
      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk status update failed');
      const count = data.count ?? (isAllMatchingSelected ? totalMatching : selectedIds.size);
      toast.success(`Updated status to "${status}" for ${count} transactions.`);
      setSelectedIds(new Set());
      setIsAllMatchingSelected(false);
      setBulkStatus('');
      refreshLedger();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update transaction statuses.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk delete with 30-day restore undo
  const handleBulkDelete = async () => {
    const count = isAllMatchingSelected ? totalMatching : selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Delete ${count} transaction${count === 1 ? '' : 's'}? You can undo this for 30 days.`)) return;

    setIsBulkProcessing(true);
    try {
      const payload: any = { action: 'delete' };
      if (isAllMatchingSelected) {
        payload.all_matching = true;
        payload.filters = getActiveFilterParams();
        payload.expected_count = totalMatching;
      } else {
        payload.ids = Array.from(selectedIds);
      }

      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk delete failed');

      const deletedIds: string[] = data.ids || Array.from(selectedIds);
      setSelectedIds(new Set());
      setIsAllMatchingSelected(false);
      refreshLedger();

      toast.success(`Deleted ${data.count ?? count} transaction${count === 1 ? '' : 's'}.`, {
        duration: 10000,
        action: {
          label: 'Undo',
          onClick: async () => {
            const undo = await fetch('/api/transactions/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: deletedIds }),
            });
            if (undo.ok) {
              refreshLedger();
              toast.success('Restored.');
            } else {
              toast.error('Could not restore those transactions.');
            }
          },
        },
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete selected transactions.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Download a CSV of exactly the filtered transactions
  const handleExportFilteredCsv = async () => {
    try {
      const res = await fetch(`/api/export?${buildFilterQuery()}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'financeos_transactions.csv';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${Number(res.headers.get('X-Row-Count') ?? 0).toLocaleString()} transactions as CSV.`);
    } catch {
      toast.error('Could not create the CSV. Try again.');
    }
  };

  // Open the printable report (use the browser's Print, then Save as PDF)
  const handleOpenReport = () => {
    window.open(`/report?${buildFilterQuery()}`, '_blank', 'noopener');
  };

  // Clear all filters
  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedAccount('all');
    setSelectedType('all');
    setSelectedStatus('all');
    setDatePreset('all');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setSearchQuery('');
    setSortBy('date');
    setSortOrder('desc');
    setActiveTab('all');
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
              Activity
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] text-xs font-semibold">
              Explorer
            </span>
          </div>
          <p className="text-xs text-[var(--muted-color)] mt-0.5">
            Indexed ledger with live filters, date windows, totals, and bulk management.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCatManagerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-xs font-semibold text-[var(--ink)] transition-colors shadow-xs cursor-pointer"
          >
            <FolderEdit className="w-3.5 h-3.5 text-[var(--teal)]" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-xs font-semibold text-[var(--ink)] transition-colors shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[var(--teal)]" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportFilteredCsv}
            title="Download CSV of filtered transactions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-xs font-semibold text-[var(--ink)] transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--teal)]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenReport}
            title="Open a printable report. Choose Save as PDF in the print dialog."
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-xs font-semibold text-[var(--ink)] transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[var(--teal)]" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* METRIC BANNER: Totals, Inflow (+), Outflow (-), Aggregate, Net Impact */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-[var(--surface)] p-4 sm:p-5 rounded-2xl border border-[var(--line)] shadow-vault">
        {/* Count */}
        <div className="flex flex-col gap-1 pr-2 border-r border-[var(--line-soft)] last:border-r-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--muted-color)]">
            Signal Count
          </span>
          <div className="flex items-baseline gap-1">
            <span className={cn('text-xl sm:text-2xl font-mono font-bold text-[var(--ink)]', isMasked && 'blurnum')}>
              {totalMatching.toLocaleString()}
            </span>
            <span className="text-[10px] text-[var(--faint)]">txs</span>
          </div>
        </div>

        {/* Inflow (+) */}
        <div className="flex flex-col gap-1 pr-2 sm:border-r border-[var(--line-soft)] last:border-r-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--pos)] flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[var(--pos)]" />
            Inflow
          </span>
          <span className={cn('text-xl sm:text-2xl font-mono font-bold text-[var(--pos)]', isMasked && 'blurnum')}>
            +{formatCAD(totalInflow)}
          </span>
        </div>

        {/* Outflow (-) */}
        <div className="flex flex-col gap-1 pr-2 border-r border-[var(--line-soft)] last:border-r-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--neg)] flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-[var(--neg)]" />
            Outflow
          </span>
          <span className={cn('text-xl sm:text-2xl font-mono font-bold text-[var(--neg)]', isMasked && 'blurnum')}>
            −{formatCAD(totalOutflow)}
          </span>
        </div>

        {/* Aggregate Volume */}
        <div className="flex flex-col gap-1 pr-2 sm:border-r border-[var(--line-soft)] last:border-r-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--muted-color)] flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-[var(--faint)]" />
            Aggregate
          </span>
          <span className={cn('text-xl sm:text-2xl font-mono font-bold text-[var(--ink)]', isMasked && 'blurnum')}>
            {formatCAD(aggregateVolume)}
          </span>
        </div>

        {/* Net Impact */}
        <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--muted-color)]">
            Net Impact
          </span>
          <span
            className={cn(
              'text-xl sm:text-2xl font-mono font-bold',
              netCashFlow >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]',
              isMasked && 'blurnum'
            )}
          >
            {netCashFlow >= 0 ? `+${formatCAD(netCashFlow)}` : `−${formatCAD(Math.abs(netCashFlow))}`}
          </span>
        </div>
      </div>

      {selectedType === 'all' && (
        <p className="-mt-3 px-1 text-[11px] text-[var(--faint)]">
          Totals include transfers between your own accounts. Set Type to Inflow or Outflow to leave them out.
        </p>
      )}

      {/* Primary Toolbar: Segmented Views, Search Bar & Filters Toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[var(--surface)] p-2.5 rounded-2xl border border-[var(--line)] shadow-vault">
        {/* Segmented Tabs (All Activity / To review / Pending Holds) */}
        <div className="flex items-center gap-1 bg-[var(--raised)] p-1 rounded-xl border border-[var(--line-soft)] shrink-0">
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
            {reviewCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] text-[10px] font-bold">
                {reviewCount}
              </span>
            )}
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

        {/* Live Search & Filter Controls */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchant, description or category (e.g. walmart, cat:coffee)…"
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[var(--raised)] border border-[var(--line-soft)] text-xs text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--faint)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shrink-0',
              showFilters
                ? 'border-[var(--teal)] bg-[var(--teal-soft)] text-[var(--teal)]'
                : 'border-[var(--line)] bg-[var(--raised)] text-[var(--muted-color)] hover:text-[var(--ink)]'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showFilters ? 'Hide Filters' : 'Filters'}</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[var(--teal)] animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* ADVANCED FILTER PANEL: Temporal Window, Magnitude, Dropdowns & Sort */}
      {showFilters && (
        <div className="flex flex-col gap-3.5 bg-[var(--surface)] p-4 rounded-2xl border border-[var(--line)] shadow-vault text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Row 1: Temporal Window / Date Shortcuts */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[var(--line-soft)]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-color)] flex items-center gap-1.5 mr-1">
                <Calendar className="w-3.5 h-3.5 text-[var(--teal)]" />
                Temporal Window:
              </span>
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: '7D', label: '7D' },
                  { id: '30D', label: '30D' },
                  { id: '90D', label: '90D' },
                  { id: 'YTD', label: 'YTD' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                  { id: 'custom', label: 'Custom' },
                ] as const
              ).map((preset) => {
                const isActive = datePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleDatePreset(preset.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      isActive
                        ? 'bg-[var(--teal)] text-white shadow-xs'
                        : 'bg-[var(--raised)] text-[var(--muted-color)] hover:text-[var(--ink)] hover:bg-[var(--line-soft)]'
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Pickers (Date From - Date To) */}
            <div className="flex items-center gap-2 flex-wrap bg-[var(--raised)]/60 px-3 py-1.5 rounded-xl border border-[var(--line-soft)]">
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted-color)]">From:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDatePreset('custom');
                    setDateFrom(e.target.value);
                  }}
                  className="h-7 px-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
                />
              </div>
              <span className="text-[var(--faint)] text-xs">→</span>
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted-color)]">To:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDatePreset('custom');
                    setDateTo(e.target.value);
                  }}
                  className="h-7 px-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
                />
              </div>
              {dateFrom && dateTo && dateFrom > dateTo && (
                <span className="text-[11px] text-[var(--warn)]">Showing {dateTo} → {dateFrom}</span>
              )}
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setDatePreset('all');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  title="Clear dates"
                  className="p-1 text-[var(--muted-color)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Magnitude (Min/Max Amount) & Active Filter Dropdowns */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1 text-[var(--muted-color)] font-semibold text-[11px] uppercase tracking-wider mr-1">
                <Filter className="w-3.5 h-3.5 text-[var(--teal)]" />
                <span>Filters:</span>
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-[var(--raised)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categoriesList.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>

              {/* Account Filter */}
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-[var(--raised)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] cursor-pointer"
              >
                <option value="all">All Accounts</option>
                {Array.from(accountsMap.entries()).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-[var(--raised)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="Outflow">Outflow (Expenses)</option>
                <option value="Inflow">Inflow (Income)</option>
                <option value="Transfers">Transfers</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-[var(--raised)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="posted">Posted</option>
                <option value="pending">Pending</option>
              </select>

              {/* Magnitude Filter (Min / Max $) */}
              <div className="flex items-center gap-1.5 pl-1">
                <span className="text-[11px] font-semibold text-[var(--muted-color)]">Amount:</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Min $"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="w-18 h-8 px-2 rounded-lg bg-[var(--raised)] border border-[var(--line)] text-xs text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
                />
                <span className="text-[var(--faint)]">−</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Max $"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="w-18 h-8 px-2 rounded-lg bg-[var(--raised)] border border-[var(--line)] text-xs text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
                />
              </div>
            </div>

            {/* Sort Controls & Reset */}
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--raised)] p-0.5 text-xs font-semibold">
                <button
                  onClick={() => {
                    if (sortBy === 'date') {
                      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                    } else {
                      setSortBy('date');
                      setSortOrder('desc');
                    }
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1',
                    sortBy === 'date'
                      ? 'bg-[var(--surface)] text-[var(--teal)] shadow-xs'
                      : 'text-[var(--muted-color)] hover:text-[var(--ink)]'
                  )}
                >
                  <span>Date</span>
                  {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
                </button>
                <button
                  onClick={() => {
                    if (sortBy === 'amount') {
                      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                    } else {
                      setSortBy('amount');
                      setSortOrder('desc');
                    }
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1',
                    sortBy === 'amount'
                      ? 'bg-[var(--surface)] text-[var(--teal)] shadow-xs'
                      : 'text-[var(--muted-color)] hover:text-[var(--ink)]'
                  )}
                >
                  <span>Amount</span>
                  {sortBy === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-xs text-[var(--teal)] hover:underline font-semibold cursor-pointer ml-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SELECT-ALL MATCHING PROMPT BANNER */}
      {selectedIds.size === filteredTransactions.length && filteredTransactions.length < totalMatching && !isAllMatchingSelected && (
        <div className="bg-[var(--teal-soft)] border border-[var(--teal)]/30 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-[var(--ink)] animate-in fade-in">
          <span>
            All <b>{filteredTransactions.length}</b> transactions loaded on this page are selected.
          </span>
          <button
            onClick={() => setIsAllMatchingSelected(true)}
            className="font-bold text-[var(--teal)] hover:underline cursor-pointer"
          >
            Select all {totalMatching.toLocaleString()} matching transactions
          </button>
        </div>
      )}

      {isAllMatchingSelected && (
        <div className="bg-[var(--teal-soft)] border border-[var(--teal)]/40 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-[var(--ink)] animate-in fade-in">
          <span>
            All <b>{totalMatching.toLocaleString()}</b> transactions matching your active filters are selected.
          </span>
          <button
            onClick={() => {
              setIsAllMatchingSelected(false);
              setSelectedIds(new Set());
            }}
            className="font-semibold text-[var(--muted-color)] hover:text-[var(--ink)] hover:underline cursor-pointer"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* BULK ACTION STICKY BAR: Type, Status, Category, Delete */}
      {(selectedIds.size > 0 || isAllMatchingSelected) && (
        <div className="sticky top-20 z-20 flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--ink)] text-[var(--surface)] rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Layers className="w-4 h-4 text-[var(--teal)]" />
            <span>
              {isAllMatchingSelected ? totalMatching.toLocaleString() : selectedIds.size} transactions selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Change Type */}
            <select
              value={bulkType}
              disabled={isBulkProcessing}
              onChange={(e) => {
                const val = e.target.value as 'Inflow' | 'Outflow' | 'Transfers';
                setBulkType(val);
                if (val) handleBulkUpdateType(val);
              }}
              className="h-8 px-2.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--teal)] cursor-pointer"
            >
              <option value="" className="text-black">Change Type…</option>
              <option value="Inflow" className="text-black">Inflow (Income)</option>
              <option value="Outflow" className="text-black">Outflow (Expense)</option>
              <option value="Transfers" className="text-black">Transfers</option>
            </select>

            {/* Bulk Change Status */}
            <select
              value={bulkStatus}
              disabled={isBulkProcessing}
              onChange={(e) => {
                const val = e.target.value as 'posted' | 'pending';
                setBulkStatus(val);
                if (val) handleBulkUpdateStatus(val);
              }}
              className="h-8 px-2.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--teal)] cursor-pointer"
            >
              <option value="" className="text-black">Change Status…</option>
              <option value="posted" className="text-black">Mark Posted</option>
              <option value="pending" className="text-black">Mark Pending</option>
            </select>

            {/* Bulk Change Category */}
            <select
              value={bulkCategory}
              disabled={isBulkProcessing}
              onChange={(e) => {
                const cat = e.target.value;
                setBulkCategory(cat);
                if (cat) handleBulkUpdateCategory(cat);
              }}
              className="h-8 px-2.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--teal)] cursor-pointer"
            >
              <option value="" className="text-black">Assign Category…</option>
              {categoriesList.map((c) => (
                <option key={c.name} value={c.name} className="text-black">
                  {c.name}
                </option>
              ))}
            </select>

            {/* Bulk Delete Button */}
            <button
              onClick={handleBulkDelete}
              disabled={isBulkProcessing}
              className="h-8 px-3 rounded-xl bg-[var(--neg)] hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 transition-opacity cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => {
                setSelectedIds(new Set());
                setIsAllMatchingSelected(false);
              }}
              className="h-8 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* LEDGER FEED */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4 sm:p-6 shadow-vault">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--line-soft)] text-xs text-[var(--muted-color)]">
          <button
            onClick={handleSelectAllOnPage}
            className="flex items-center gap-2 hover:text-[var(--ink)] transition-colors cursor-pointer font-semibold"
          >
            {isAllMatchingSelected || (selectedIds.size > 0 && selectedIds.size === filteredTransactions.length) ? (
              <CheckSquare className="w-4 h-4 text-[var(--teal)]" />
            ) : (
              <Square className="w-4 h-4 text-[var(--faint)]" />
            )}
            <span>
              {isAllMatchingSelected
                ? `All ${totalMatching.toLocaleString()} matching selected`
                : `Select page (${filteredTransactions.length})`}
            </span>
          </button>
          <span className="font-mono text-[11px]">{totalMatching.toLocaleString()} matching records</span>
        </div>

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
                : 'Try adjusting your search query, date window, or clear active filters.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-2 text-xs font-semibold text-[var(--teal)] hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
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
                    <span
                      className={cn(
                        'font-mono font-semibold',
                        isPositive ? 'text-[var(--pos)]' : 'text-[var(--ink)]',
                        isMasked && 'blurnum'
                      )}
                    >
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
                      const isSelected = selectedIds.has(tx.id) || isAllMatchingSelected;

                      return (
                        <div
                          key={tx.id}
                          onClick={() => setSelectedTx(tx)}
                          className={cn(
                            'grid grid-cols-[24px_36px_1fr_auto] gap-3 items-center py-2.5 px-2 -mx-2 rounded-xl hover:bg-[var(--raised)] transition-colors cursor-pointer group',
                            isSelected && 'bg-[var(--teal-soft)]/40'
                          )}
                        >
                          {/* Checkbox */}
                          <div
                            onClick={(e) => handleToggleSelect(tx.id, e)}
                            className="grid place-items-center cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[var(--teal)]" />
                            ) : (
                              <Square className="w-4 h-4 text-[var(--line)] group-hover:text-[var(--faint)]" />
                            )}
                          </div>

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
                              {tx.type && (
                                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-[var(--line-soft)] text-[var(--muted-color)]">
                                  {tx.type}
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
                            <span
                              className={cn(
                                'font-mono font-semibold text-xs sm:text-sm block',
                                isIncome ? 'text-[var(--pos)]' : 'text-[var(--ink)]',
                                isMasked && 'blurnum'
                              )}
                            >
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

      {hasNextPage && (
        <div className="flex justify-center -mt-2">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-xs font-semibold text-[var(--ink)] disabled:opacity-60 cursor-pointer shadow-xs"
          >
            {isFetchingNextPage ? 'Loading…' : `Load more (${(totalMatching - allTransactions.length).toLocaleString()} left)`}
          </button>
        </div>
      )}

      {/* Details Slide-over Sheet */}
      {selectedTx && (
        <TransactionDrawer
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
          onUpdate={refreshLedger}
          onDelete={() => {
            setSelectedTx(null);
            refreshLedger();
          }}
        />
      )}

      {/* Modals */}
      <CsvImportDialog isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />

      <CategoryManagerDialog
        isOpen={isCatManagerOpen}
        onClose={() => setIsCatManagerOpen(false)}
        categories={categoriesList}
      />

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
