'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Transaction,
  formatCAD,
  STANDARD_CATEGORIES,
  CategoryItem,
  TransactionSortField,
} from '@financeos/shared';
import { useFinanceStore } from '@/lib/store';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  Edit2,
  Loader2,
  Printer,
  Layers,
  Calendar,
  Building2,
  CreditCard,
  Eye,
  SlidersHorizontal,
  Check,
  Palette,
  RefreshCw,
} from 'lucide-react';
import { TransactionDrawer } from '@/components/transactions/TransactionDrawer';
import { toast } from 'sonner';

function formatMeshDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return `${months[monthIdx]} ${day}, ${year}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getNodeLabel(account?: { bank_name?: string; account_name?: string } | null): string {
  if (!account) return 'LEDGER ACC';
  const name = (account.account_name || '').toUpperCase();
  const bank = (account.bank_name || '').toUpperCase();
  if (bank.includes('CIBC')) {
    if (name.includes('CHEQUING')) return 'CIBC ACC';
    if (name.includes('SAVING')) return 'CIBC SAV';
    if (name.includes('DIVIDEND') || name.includes('VISA')) return 'CIBC VISA';
    return 'CIBC ACC';
  }
  if (bank.includes('RBC')) {
    if (name.includes('CHEQUING')) return 'RBC ACC';
    if (name.includes('SAVING')) return 'RBC SAV';
    if (name.includes('FIND')) return 'RBC FIND&SAVE';
    return 'RBC SAV';
  }
  if (bank.includes('TD')) {
    if (name.includes('CHEQUING')) return 'TD ACC';
    if (name.includes('SAVING')) return 'TD SAV';
    if (name.includes('LOW RATE') || name.includes('VISA')) return 'TD VISA';
    return 'TD ACC';
  }
  if (bank.includes('ROGERS')) return 'ROGERS MC';
  if (bank.includes('AMEX') || bank.includes('AMERICAN EXPRESS')) {
    if (name.includes('GREEN')) return 'AMEX GREEN';
    if (name.includes('ESSENTIAL')) return 'AMEX ESSENTIAL';
    if (name.includes('SIMPLY')) return 'AMEX CASH';
    return 'AMEX CARD';
  }
  return `${bank.slice(0, 4)} ${name.slice(0, 4)}`;
}

function getSourceNode(tx: Transaction): string {
  return getNodeLabel(tx.account);
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const { openAddTransaction } = useFinanceStore();

  // Filter States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<string>('all'); // 'all', account_id, or 'bank:NAME'
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all'); // 'all', 'Inflow', 'Outflow', 'Transfers'
  const [temporalWindow, setTemporalWindow] = useState<'all' | '7d' | '30d' | '90d' | 'ytd' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [sortBy, setSortBy] = useState<TransactionSortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(50);

  // Mesh UI toggles & dropdown popovers
  const [showMeshFilters, setShowMeshFilters] = useState(true);
  const [auditMode, setAuditMode] = useState(false);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [categoryFilterSearch, setCategoryFilterSearch] = useState('');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortRef = React.useRef<HTMLDivElement>(null);
  const catFilterRef = React.useRef<HTMLDivElement>(null);

  // Category Deletion & Reassociation Modal States
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<{
    name: string;
    count: number;
  } | null>(null);
  const [deleteReassignMode, setDeleteReassignMode] = useState<'existing' | 'new' | 'none'>('existing');
  const [deleteReassignTarget, setDeleteReassignTarget] = useState<string>('');
  const [deleteNewCategoryName, setDeleteNewCategoryName] = useState<string>('');

  // Close floating popovers on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
      if (catFilterRef.current && !catFilterRef.current.contains(event.target as Node)) {
        setIsCategoryFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selection & Modal States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeDrawerTx, setActiveDrawerTx] = useState<Transaction | null>(null);
  const [deleteTargetTx, setDeleteTargetTx] = useState<Transaction | null>(null);
  const [editingCategoryTx, setEditingCategoryTx] = useState<Transaction | null>(null);
  const [selectedCategorySet, setSelectedCategorySet] = useState<Set<string>>(new Set());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvImportText, setCsvImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Bulk Operation Modal States
  const [isBulkCategorizeModalOpen, setIsBulkCategorizeModalOpen] = useState(false);
  const [bulkSelectedCategories, setBulkSelectedCategories] = useState<Set<string>>(new Set());
  const [bulkCategorySearch, setBulkCategorySearch] = useState('');
  const [bulkInlineNewCat, setBulkInlineNewCat] = useState('');
  const [bulkMode, setBulkMode] = useState<'replace' | 'append'>('replace');
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkTypeModalOpen, setIsBulkTypeModalOpen] = useState(false);
  const [bulkSelectedType, setBulkSelectedType] = useState<'Inflow' | 'Outflow' | 'Transfers'>('Inflow');

  // Sync selectedCategorySet when editingCategoryTx changes
  useEffect(() => {
    if (editingCategoryTx) {
      const cats = editingCategoryTx.category
        ? editingCategoryTx.category.split(',').map((c) => c.trim()).filter(Boolean)
        : ['General'];
      setSelectedCategorySet(new Set(cats));
    }
  }, [editingCategoryTx]);

  // Column Header Sort Toggle
  const handleSort = (field: TransactionSortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      // Default amount and date to descending, text fields to ascending
      if (field === 'date' || field === 'amount') {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
    setPage(1);
  };

  const renderSortIndicator = (field: TransactionSortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-80 transition-opacity" />;
    }
    return (
      <span className="text-primary font-bold text-xs inline-flex items-center">
        {sortOrder === 'desc' ? '↓' : '↑'}
      </span>
    );
  };

  // Custom Category Modal States
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  const [categoryEditSearch, setCategoryEditSearch] = useState('');
  const [inlineNewCategory, setInlineNewCategory] = useState('');

  // Fetch Categories from Database API
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      return res.json();
    },
  });

  const categoriesList: CategoryItem[] = categoriesData?.categories || [];

  const allCategoryNames = useMemo(() => {
    const set = new Set<string>();
    categoriesList.forEach((c) => set.add(c.name));
    STANDARD_CATEGORIES.forEach((c) => set.add(c));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [categoriesList]);

  // Add Category Mutation
  const addCategoryMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Category "${data.category.name}" created and saved!`);
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        setSelectedCategories((prev) => [...prev, data.category.name]);
        setIsAddCategoryModalOpen(false);
        setNewCategoryName('');
      } else {
        toast.error(data.error || 'Failed to create category');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error creating category');
    },
  });

  // Delete Category Mutation with Transaction Reassociation
  const deleteCategoryMutation = useMutation({
    mutationFn: async ({
      name,
      reassignTo,
      newCategoryName,
    }: {
      name: string;
      reassignTo?: string;
      newCategoryName?: string;
    }) => {
      const res = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, reassignTo, newCategoryName }),
      });
      return res.json();
    },
    onSuccess: (data, vars) => {
      if (data.success) {
        toast.success(
          `Category "${vars.name}" deleted. ${data.affectedCount || 0} transactions reassociated to "${data.reassignedTo || 'General'}".`
        );
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        setSelectedCategories((prev) => prev.filter((c) => c !== vars.name));
        setDeleteCategoryTarget(null);
      } else {
        toast.error(data.error || 'Failed to delete category');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error deleting category');
    },
  });

  const handleTemporalSelect = (w: 'all' | '7d' | '30d' | '90d' | 'ytd' | 'custom') => {
    setTemporalWindow(w);
    setPage(1);
    const today = new Date().toISOString().split('T')[0];

    if (w === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (w === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    } else if (w === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    } else if (w === '90d') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    } else if (w === 'ytd') {
      setDateFrom('2026-01-01');
      setDateTo(today);
    }
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Transactions with query params
  const { data: txData, isLoading, isFetching, refetch: refetchTransactions } = useQuery({
    queryKey: [
      'transactions',
      debouncedSearch,
      selectedNode,
      selectedBank,
      selectedCategories,
      selectedStatus,
      selectedType,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      sortBy,
      sortOrder,
      page,
      limit,
    ],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (debouncedSearch) q.set('search', debouncedSearch);

      // Node / Account filtering
      if (selectedNode !== 'all') {
        if (selectedNode.startsWith('bank:')) {
          q.append('banks', selectedNode.replace('bank:', ''));
        } else {
          q.append('account_ids', selectedNode);
        }
      } else if (selectedBank !== 'all') {
        q.append('banks', selectedBank);
      }

      if (selectedCategories.length > 0) {
        selectedCategories.forEach((c) => q.append('categories', c));
      }
      if (selectedStatus !== 'all') q.set('status', selectedStatus);
      if (selectedType !== 'all') q.set('type', selectedType);
      if (dateFrom) q.set('date_from', dateFrom);
      if (dateTo) q.set('date_to', dateTo);
      if (amountMin) q.set('amount_min', amountMin);
      if (amountMax) q.set('amount_max', amountMax);
      q.set('sort_by', sortBy);
      q.set('sort_order', sortOrder);
      q.set('page', page.toString());
      q.set('limit', limit.toString());

      const res = await fetch(`/api/transactions?${q.toString()}`);
      return res.json();
    },
  });

  // Fetch Accounts for filters
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
  });

  const accounts = accountsData?.accounts || [];
  let transactions: Transaction[] = txData?.transactions || [];
  if (auditMode) {
    // In audit mode, prioritize pending or high-magnitude items
    transactions = [...transactions].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return Math.abs(b.amount) - Math.abs(a.amount);
    });
  }

  const totalCount = txData?.total || 0;
  const totalPages = txData?.totalPages || 1;

  // Selected transactions helpers for bulk operations
  const selectedTransactions = useMemo(() => {
    return transactions.filter((t) => selectedIds.has(t.id));
  }, [transactions, selectedIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedTransactions.reduce((acc, t) => acc + t.amount, 0);
  }, [selectedTransactions]);

  // Single Delete Mutation (with Optimistic Removal)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok && res.status !== 404) {
        throw new Error(data.error || 'Failed to delete transaction');
      }
      return { ...data, id };
    },
    onMutate: async (id: string) => {
      // Optimistically remove from all transaction query caches immediately
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      queryClient.setQueriesData({ queryKey: ['transactions'] }, (old: any) => {
        if (!old || !Array.isArray(old.transactions)) return old;
        return {
          ...old,
          transactions: old.transactions.filter((t: any) => t.id !== id),
          total: Math.max(0, (old.total || 1) - 1),
        };
      });
    },
    onSuccess: () => {
      toast.success('Transaction permanently removed from database');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setActiveDrawerTx(null);
      setDeleteTargetTx(null);
    },
    onError: (err: any) => {
      if (err.message?.includes('not found')) {
        toast.info('Transaction already removed from database');
      } else {
        toast.error(err.message || 'Error deleting transaction');
      }
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDeleteTargetTx(null);
    },
  });

  // Multi-Category Update Mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({
      id,
      category,
      categories,
    }: {
      id: string;
      category?: string;
      categories?: string[];
    }) => {
      const body: any = {};
      if (categories) {
        body.categories = categories;
        body.category = categories.join(', ');
      } else if (category) {
        body.category = category;
      }
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      toast.success('Categories updated');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setEditingCategoryTx(null);
    },
  });

  // Bulk Operations Mutation
  const bulkMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (variables.action === 'update') {
        const idSet = new Set(variables.ids);
        queryClient.setQueriesData({ queryKey: ['transactions'] }, (old: any) => {
          if (!old || !Array.isArray(old.transactions)) return old;
          return {
            ...old,
            transactions: old.transactions.map((t: any) => {
              if (!idSet.has(t.id)) return t;
              let nextCat = t.category;
              if (variables.category) {
                if (variables.mode === 'append' && t.category) {
                  const existing = t.category.split(',').map((s: string) => s.trim()).filter(Boolean);
                  const toAdd = variables.category.split(',').map((s: string) => s.trim()).filter(Boolean);
                  nextCat = Array.from(new Set([...existing, ...toAdd])).join(', ');
                } else {
                  nextCat = variables.category;
                }
              }
              let nextAmount = t.amount;
              let nextDebit = t.debit;
              let nextCredit = t.credit;
              let nextType = t.type;
              if (variables.type) {
                nextType = variables.type;
                if (variables.type === 'Inflow' && t.amount < 0) {
                  nextAmount = Math.abs(t.amount);
                  nextCredit = nextAmount;
                  nextDebit = null;
                } else if (variables.type === 'Outflow' && t.amount > 0) {
                  nextAmount = -Math.abs(t.amount);
                  nextDebit = Math.abs(t.amount);
                  nextCredit = null;
                }
              }
              return {
                ...t,
                category: nextCat,
                categories: nextCat ? nextCat.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
                ...(variables.status ? { status: variables.status } : {}),
                ...(variables.type ? { type: nextType, amount: nextAmount, debit: nextDebit, credit: nextCredit } : {}),
              };
            }),
          };
        });
      } else if (variables.action === 'delete') {
        const idSet = new Set(variables.ids);
        queryClient.setQueriesData({ queryKey: ['transactions'] }, (old: any) => {
          if (!old || !Array.isArray(old.transactions)) return old;
          return {
            ...old,
            transactions: old.transactions.filter((t: any) => !idSet.has(t.id)),
            total: Math.max(0, (old.total || 0) - idSet.size),
          };
        });
      }
      toast.success(data.message || '✓ Bulk operation completed successfully');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setSelectedIds(new Set());
    },
  });

  // Select all on current page toggle
  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // CSV Export
  const handleExportCSV = () => {
    const q = new URLSearchParams();
    if (debouncedSearch) q.set('search', debouncedSearch);
    if (dateFrom) q.set('date_from', dateFrom);
    if (dateTo) q.set('date_to', dateTo);
    if (selectedStatus !== 'all') q.set('status', selectedStatus);
    window.location.href = `/api/export?${q.toString()}`;
  };

  // CSV Import
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvImportText.trim()) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: csvImportText }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        setIsImportModalOpen(false);
        setCsvImportText('');
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Import error');
    } finally {
      setIsImporting(false);
    }
  };

  const resetAllFilters = () => {
    setSearch('');
    setSelectedNode('all');
    setSelectedBank('all');
    setSelectedCategories([]);
    setSelectedStatus('all');
    setSelectedType('all');
    setTemporalWindow('all');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setSortBy('date');
    setSortOrder('desc');
    setPage(1);
    toast.info('Ledger filters reset to default');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Mesh Search & Action Bar (Matching Screenshot 1) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-executive space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchants, categories, or notes (e.g. Tim Hortons, Presto, Uber)..."
              className="w-full h-10 pl-9 pr-4 text-xs rounded-lg bg-card border border-border focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none transition-all placeholder:text-muted-foreground/70"
            />
          </div>

          {/* Quick Action Icons & Modes */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Refresh Ledger */}
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['accounts'] });
                queryClient.invalidateQueries({ queryKey: ['categories'] });
                refetchTransactions();
                toast.success('Ledger and account balances refreshed');
              }}
              disabled={isFetching}
              title="Refresh Ledger and Balances"
              className="flex items-center gap-1.5 px-3 h-10 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
              <span>{isFetching ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {/* Print */}
            <button
              onClick={() => window.print()}
              title="Print Current Ledger"
              className="p-2 h-10 w-10 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Export */}
            <button
              onClick={handleExportCSV}
              title="Download Ledger CSV"
              className="p-2 h-10 w-10 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Transaction Type Filter Dropdown */}
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
              className="px-3 h-10 text-xs font-semibold rounded-lg bg-card border border-border text-foreground focus:ring-2 focus:ring-accent focus:outline-none cursor-pointer"
            >
              <option value="all" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>All Types</option>
              <option value="Inflow" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>+ Inflow Only</option>
              <option value="Outflow" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>- Outflow Only</option>
              <option value="Transfers" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>⇄ Transfers Only</option>
            </select>

            {/* Audit Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                setAuditMode(!auditMode);
                toast.info(auditMode ? 'Exited Audit Mode' : 'Audit Mode Activated: Spotlighting holds & anomalies');
              }}
              className={`flex items-center gap-1.5 px-3 h-10 text-xs font-semibold rounded-lg border transition-all ${
                auditMode
                  ? 'bg-warning/10 text-warning border-warning/25'
                  : 'bg-card border-border hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Audit Mode</span>
            </button>

            {/* Hide/Show Mesh Filters Toggle (Executive Precision Primary Button) */}
            <button
              type="button"
              onClick={() => setShowMeshFilters(!showMeshFilters)}
              className="flex items-center gap-2 px-3.5 h-10 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-xs"
            >
              <Filter className="w-4 h-4" />
              <span>{showMeshFilters ? 'Hide Mesh Filters' : 'Show Mesh Filters'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Filter Mesh Section */}
        {showMeshFilters && (
          <div className="pt-3 border-t border-border space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* Row 1: Temporal Window, Magnitude, Mesh Maintenance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Temporal Window */}
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> TEMPORAL WINDOW
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'all', label: 'All' },
                    { id: '7d', label: '7D' },
                    { id: '30d', label: '30D' },
                    { id: '90d', label: '90D' },
                    { id: 'ytd', label: 'YTD' },
                    { id: 'custom', label: 'Custom' },
                  ].map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => handleTemporalSelect(w.id as any)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        temporalWindow === w.id
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Magnitude Filter */}
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  MAGNITUDE FILTER ($CAD)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={amountMin}
                    onChange={(e) => {
                      setAmountMin(e.target.value);
                      setPage(1);
                    }}
                    className="w-24 px-3 py-1.5 text-xs rounded-lg bg-card border border-border focus:ring-1 focus:ring-accent focus:outline-none tabular-nums"
                  />
                  <span className="text-muted-foreground text-xs">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={amountMax}
                    onChange={(e) => {
                      setAmountMax(e.target.value);
                      setPage(1);
                    }}
                    className="w-24 px-3 py-1.5 text-xs rounded-lg bg-card border border-border focus:ring-1 focus:ring-accent focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* Mesh Maintenance */}
              <div className="flex flex-col md:items-end justify-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  MESH MAINTENANCE
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        'Wipe transaction mesh? This will reset all current filters and clear ledger filters.'
                      )
                    ) {
                      resetAllFilters();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 h-8 text-xs font-semibold rounded-lg bg-negative/10 text-negative border border-negative/20 hover:bg-negative/15 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Wipe Transaction Mesh</span>
                </button>
              </div>
            </div>

            {/* Custom Date Range if Custom Selected */}
            {temporalWindow === 'custom' && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary border border-border text-xs text-muted-foreground">
                <span className="font-semibold">Custom Window:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded-md bg-card border border-border focus:outline-none"
                />
                <span>to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded-md bg-card border border-border focus:outline-none"
                />
              </div>
            )}

            {/* Row 2: Active Filters Pills & + Add Signal (With Categories Multi-Select & High Visibility Sort) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                  ACTIVE FILTERS:
                </span>

                {/* Specific Source Node / Account Filter */}
                <select
                  value={selectedNode}
                  onChange={(e) => {
                    setSelectedNode(e.target.value);
                    setPage(1);
                  }}
                  style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                  className="px-3 h-8 text-xs font-semibold rounded-lg bg-card border border-border focus:outline-none cursor-pointer text-foreground max-w-[200px]"
                >
                  <option value="all" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>All Source Nodes (13)</option>
                  <optgroup label="Specific Nodes (Accounts)" style={{ backgroundColor: 'hsl(var(--card))', color: "hsl(var(--muted-foreground))" }}>
                    {accounts.map((acc: any) => (
                      <option key={acc.id} value={acc.id} style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>
                        {getNodeLabel(acc)} – {acc.account_name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Filter by Institution" style={{ backgroundColor: 'hsl(var(--card))', color: "hsl(var(--muted-foreground))" }}>
                    <option value="bank:CIBC" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>CIBC (All Nodes)</option>
                    <option value="bank:TD" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>TD Bank (All Nodes)</option>
                    <option value="bank:RBC" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>RBC Royal Bank (All Nodes)</option>
                    <option value="bank:Rogers Bank" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>Rogers Bank (All Nodes)</option>
                    <option value="bank:American Express" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>American Express (All Nodes)</option>
                  </optgroup>
                </select>

                {/* Multi-Select Categories Filter Popover */}
                <div className="relative" ref={catFilterRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
                    className={`px-3 h-8 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedCategories.length > 0
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-secondary text-foreground border-border hover:bg-secondary/80'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>
                      {selectedCategories.length === 0
                        ? `All Categories (${allCategoryNames.length})`
                        : `Categories (${selectedCategories.length})`}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${isCategoryFilterOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Category Multi-Select Dropdown Popover */}
                  {isCategoryFilterOpen && (
                    <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-card border border-border shadow-2xl rounded-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-foreground space-y-2.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search categories..."
                          value={categoryFilterSearch}
                          onChange={(e) => setCategoryFilterSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-1 border-b border-border pb-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCategories([])}
                          className="hover:text-primary transition-colors cursor-pointer"
                        >
                          Select All (Show All)
                        </button>
                        {selectedCategories.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedCategories([])}
                            className="text-negative hover:text-negative transition-colors cursor-pointer"
                          >
                            Clear Selection
                          </button>
                        )}
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                        {allCategoryNames
                          .filter(
                            (c) =>
                              !categoryFilterSearch.trim() ||
                              c.toLowerCase().includes(categoryFilterSearch.toLowerCase())
                          )
                          .map((catName) => {
                            const isChecked = selectedCategories.includes(catName);
                            return (
                              <div
                                key={catName}
                                className={`flex items-center justify-between p-1.5 px-2 rounded-lg text-xs transition-colors group ${
                                  isChecked
                                    ? 'bg-primary/20 text-white font-semibold'
                                    : 'text-foreground hover:bg-secondary hover:text-foreground'
                                }`}
                              >
                                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setSelectedCategories(selectedCategories.filter((c) => c !== catName));
                                      } else {
                                        setSelectedCategories([...selectedCategories, catName]);
                                      }
                                      setPage(1);
                                    }}
                                    className="rounded border-border text-primary focus:ring-0 cursor-pointer"
                                  />
                                  <span className="line-clamp-1">{catName}</span>
                                </label>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const count = transactions.filter(
                                      (t) => t.category && t.category.includes(catName)
                                    ).length;
                                    setDeleteCategoryTarget({ name: catName, count });
                                    setDeleteReassignMode('existing');
                                    const other = allCategoryNames.find((o) => o !== catName) || 'General';
                                    setDeleteReassignTarget(other);
                                    setIsCategoryFilterOpen(false);
                                  }}
                                  className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-negative hover:bg-negative/10 rounded transition-all cursor-pointer"
                                  title={`Delete category "${catName}" and associate nodes`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCategoryFilterOpen(false);
                            setIsAddCategoryModalOpen(true);
                          }}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>New Category</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCategoryFilterOpen(false)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-secondary hover:bg-secondary text-white cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Category Tags in Active Filters Bar */}
                {selectedCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-primary/20 text-primary border border-primary/30 animate-in fade-in"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategories(selectedCategories.filter((c) => c !== cat));
                        setPage(1);
                      }}
                      className="hover:bg-primary/30 rounded p-0.5 cursor-pointer"
                      title={`Remove ${cat} from filter`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* All Statuses Dropdown */}
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                  className="px-3 h-8 text-xs font-semibold rounded-lg bg-card border border-border focus:outline-none cursor-pointer text-foreground"
                >
                  <option value="all" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>All Statuses</option>
                  <option value="posted" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>Posted Only</option>
                  <option value="pending" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>Pending Only</option>
                </select>

                {/* Comprehensive High-Visibility Sort Dropdown */}
                <div className="relative" ref={sortRef}>
                  <button
                    type="button"
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="h-8 px-3 text-xs font-semibold rounded-lg bg-card border border-border text-foreground hover:bg-secondary transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Sort:</span>
                    <span className="text-white font-medium">
                      {sortBy === 'date'
                        ? sortOrder === 'desc'
                          ? 'Date: Newest First (Desc)'
                          : 'Date: Oldest First (Asc)'
                        : sortBy === 'amount'
                        ? sortOrder === 'desc'
                          ? 'Amount: Higher First (Desc)'
                          : 'Amount: Lower First (Asc)'
                        : sortBy === 'merchant'
                        ? sortOrder === 'asc'
                          ? 'Merchant: A → Z (Asc)'
                          : 'Merchant: Z → A (Desc)'
                        : sortBy === 'category'
                        ? sortOrder === 'asc'
                          ? 'Classification: A → Z (Asc)'
                          : 'Classification: Z → A (Desc)'
                        : sortBy === 'node'
                        ? sortOrder === 'asc'
                          ? 'Source Node: A → Z (Asc)'
                          : 'Source Node: Z → A (Desc)'
                        : `Type: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isSortDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 p-1.5 bg-card border border-border shadow-2xl rounded-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="space-y-0.5">
                        {[
                          { id: 'date-desc', field: 'date', order: 'desc', label: 'Date: Newest First (Desc)' },
                          { id: 'date-asc', field: 'date', order: 'asc', label: 'Date: Oldest First (Asc)' },
                          { id: 'amount-desc', field: 'amount', order: 'desc', label: 'Amount: Higher First (Desc)' },
                          { id: 'amount-asc', field: 'amount', order: 'asc', label: 'Amount: Lower First (Asc)' },
                          { id: 'merchant-asc', field: 'merchant', order: 'asc', label: 'Merchant: A → Z (Asc)' },
                          { id: 'merchant-desc', field: 'merchant', order: 'desc', label: 'Merchant: Z → A (Desc)' },
                          { id: 'category-asc', field: 'category', order: 'asc', label: 'Classification: A → Z (Asc)' },
                          { id: 'category-desc', field: 'category', order: 'desc', label: 'Classification: Z → A (Desc)' },
                          { id: 'node-asc', field: 'node', order: 'asc', label: 'Source Node: A → Z (Asc)' },
                          { id: 'node-desc', field: 'node', order: 'desc', label: 'Source Node: Z → A (Desc)' },
                          { id: 'type-asc', field: 'type', order: 'asc', label: 'Type: Ascending' },
                          { id: 'type-desc', field: 'type', order: 'desc', label: 'Type: Descending' },
                        ].map((opt) => {
                          const isCurrent = sortBy === opt.field && sortOrder === opt.order;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setSortBy(opt.field as any);
                                setSortOrder(opt.order as any);
                                setIsSortDropdownOpen(false);
                                setPage(1);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                                isCurrent
                                  ? 'bg-primary text-primary-foreground font-bold'
                                  : 'text-foreground hover:bg-secondary hover:text-foreground'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {isCurrent && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2 cursor-pointer"
                >
                  Reset Mesh
                </button>
              </div>

              {/* Add Custom Category & Add Signal Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline px-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Category</span>
                </button>

                <button
                  type="button"
                  onClick={openAddTransaction}
                  className="flex items-center gap-1.5 px-3.5 h-8 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Signal</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Period Performance & Cashflow Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-card border border-border shadow-executive">
        <div className="flex items-center justify-between px-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Inflow / Credits ({temporalWindow.toUpperCase()})
            </span>
            <span className="text-base font-semibold text-positive tabular-nums">
              +{formatCAD(txData?.totalInflow || 0)}
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-positive" />
        </div>
        <div className="flex items-center justify-between px-3 border-t sm:border-t-0 sm:border-l border-border">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Outflow / Debits ({temporalWindow.toUpperCase()})
            </span>
            <span className="text-base font-semibold text-negative tabular-nums">
              -{formatCAD(txData?.totalOutflow || 0)}
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-negative" />
        </div>
        <div className="flex items-center justify-between px-3 border-t sm:border-t-0 sm:border-l border-border">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Net Period Cashflow
            </span>
            <span className="text-base font-semibold text-foreground tabular-nums">
              {formatCAD(txData?.netCashFlow || 0)}
            </span>
          </div>
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">{totalCount} Rows</span>
        </div>
      </div>

      {/* Bulk Action Bar (when items selected) */}
      {selectedIds.size > 0 && (
        <div className="p-3 px-4 rounded-2xl bg-secondary/80 border border-primary/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-black/20 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="text-xs font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
              {selectedIds.size}
            </span>
            <span>transactions selected</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-mono text-muted-foreground">{formatCAD(selectedTotalAmount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBulkSelectedCategories(new Set());
                setBulkCategorySearch('');
                setBulkInlineNewCat('');
                setBulkMode('replace');
                setIsBulkCategorizeModalOpen(true);
              }}
              className="px-3.5 h-8 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm shadow-primary/20 cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Bulk Categorize</span>
            </button>
            <button
              onClick={() => {
                setBulkSelectedType('Inflow');
                setIsBulkTypeModalOpen(true);
              }}
              className="px-3.5 h-8 text-xs font-semibold rounded-xl bg-secondary border border-border hover:bg-muted text-foreground transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Bulk Type</span>
            </button>
            <button
              onClick={() => {
                bulkMutation.mutate({ action: 'update', ids: Array.from(selectedIds), status: 'posted' });
              }}
              disabled={bulkMutation.isPending}
              className="px-3 h-8 text-xs font-semibold rounded-xl bg-positive/15 text-positive border border-positive/30 hover:bg-positive/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Posted</span>
            </button>
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-3 h-8 text-xs font-semibold rounded-xl bg-negative/15 text-negative border border-negative/30 hover:bg-negative/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Transactions Mesh Table (Exact Layout & Typography of Screenshot 2) */}
      <div className="rounded-2xl bg-card border border-border shadow-executive overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border select-none text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4 w-10">
                  <button onClick={toggleSelectAll} className="p-0.5 text-muted-foreground hover:text-foreground">
                    {selectedIds.size > 0 && selectedIds.size === transactions.length ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort('date')}
                  className="p-4 cursor-pointer hover:text-foreground transition-colors group select-none"
                  title="Click to sort by date (Newest / Oldest)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>TRANSACTION DATE</span>
                    {renderSortIndicator('date')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('source_node')}
                  className="p-4 cursor-pointer hover:text-foreground transition-colors group select-none"
                  title="Click to sort by source node"
                >
                  <div className="flex items-center gap-1.5">
                    <span>SOURCE NODE</span>
                    {renderSortIndicator('source_node')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('type')}
                  className="p-4 cursor-pointer hover:text-foreground transition-colors group select-none"
                  title="Click to sort by type (Inflow / Outflow / Transfers)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>TYPE</span>
                    {renderSortIndicator('type')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('merchant')}
                  className="p-4 cursor-pointer hover:text-foreground transition-colors group select-none"
                  title="Click to sort by merchant / description (A-Z)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>MERCHANT / DESCRIPTION</span>
                    {renderSortIndicator('merchant')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="p-4 cursor-pointer hover:text-foreground transition-colors group select-none"
                  title="Click to sort by classification (A-Z)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>CLASSIFICATION</span>
                    {renderSortIndicator('category')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('amount')}
                  className="p-4 text-right cursor-pointer hover:text-foreground transition-colors group select-none"
                  title="Click to sort by value impact (Higher / Lower)"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>VALUE IMPACT</span>
                    {renderSortIndicator('amount')}
                  </div>
                </th>
                <th className="p-4 text-center">ACTIONS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading transactions from ledger...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground/60" />
                    <span>No transactions found matching current filters.</span>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isSelected = selectedIds.has(tx.id);
                  const isExpense = tx.amount < 0;
                  const sourceNode = getSourceNode(tx);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isSelected ? 'bg-primary/[0.04]' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4">
                        <button
                          onClick={() => toggleSelectOne(tx.id)}
                          className="p-0.5 text-muted-foreground hover:text-foreground"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Transaction Date (Screenshot 2: Calendar icon card + Aug 10, 2026) */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border border-border bg-secondary flex items-center justify-center text-muted-foreground">
                            <Calendar className="w-4 h-4 opacity-75" />
                          </div>
                          <div>
                            <span className="font-semibold text-foreground text-xs block tabular-nums">
                              {formatMeshDate(tx.date)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Source Node (Clickable to filter by this specific node) */}
                      <td className="p-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = selectedNode === tx.account_id ? 'all' : tx.account_id;
                            setSelectedNode(next);
                            setPage(1);
                            toast.info(next === 'all' ? 'Cleared node filter' : `Filtered to source node: ${sourceNode}`);
                          }}
                          title={`Click to filter ledger by ${sourceNode}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-[11px] border transition-all ${
                            selectedNode === tx.account_id
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border'
                          }`}
                        >
                          <Building2 className="w-3 h-3" />
                          <span>{sourceNode}</span>
                        </button>
                      </td>

                      {/* Transaction Type Badge (Clickable to filter by this specific type) */}
                      <td className="p-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const curType = tx.type || (tx.amount > 0 ? 'Inflow' : 'Outflow');
                            const next = selectedType === curType ? 'all' : curType;
                            setSelectedType(next);
                            setPage(1);
                            toast.info(next === 'all' ? 'Cleared type filter' : `Filtered to type: ${curType}`);
                          }}
                          title={`Click to filter by ${tx.type || 'Outflow'}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${
                            (tx.type || '').toLowerCase() === 'inflow'
                              ? selectedType === 'Inflow'
                                ? 'bg-positive text-positive-foreground border-positive shadow-xs'
                                : 'bg-positive/10 text-positive border-positive/20 hover:bg-positive/20'
                              : (tx.type || '').toLowerCase().includes('transfer')
                              ? selectedType === 'Transfers'
                                ? 'bg-accent text-accent-foreground border-accent shadow-xs'
                                : 'bg-accent/10 text-accent border-accent/20 hover:bg-accent/20'
                              : selectedType === 'Outflow'
                              ? 'bg-negative text-negative-foreground border-negative shadow-xs'
                              : 'bg-negative/10 text-negative border-negative/20 hover:bg-negative/20'
                          }`}
                        >
                          {(tx.type || '').toLowerCase() === 'inflow' ? (
                            <ArrowDownLeft className="w-3 h-3" />
                          ) : (tx.type || '').toLowerCase().includes('transfer') ? (
                            <ArrowLeftRight className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          <span>{tx.type || (tx.amount > 0 ? 'Inflow' : 'Outflow')}</span>
                        </button>
                      </td>

                      {/* Merchant / Description */}
                      <td
                        onClick={() => setActiveDrawerTx(tx)}
                        className="p-4 font-medium text-foreground cursor-pointer hover:text-accent transition-colors max-w-sm"
                      >
                        <div className="font-semibold text-xs text-foreground truncate">
                          {tx.merchant || tx.description}
                        </div>
                        <div className="text-[11px] text-muted-foreground uppercase truncate mt-0.5">
                          {tx.description}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                              tx.status === 'posted'
                                ? 'bg-positive/10 text-positive border-positive/20'
                                : 'bg-warning/10 text-warning border-warning/20'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                      </td>

                      {/* Classification Badges (Multiple Categories Attached) */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-[260px]">
                          {(tx.category
                            ? tx.category.split(',').map((c) => c.trim()).filter(Boolean)
                            : ['General']
                          ).map((cat) => {
                            const isFiltered = selectedCategories.includes(cat);
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const next = isFiltered
                                    ? selectedCategories.filter((c) => c !== cat)
                                    : [...selectedCategories, cat];
                                  setSelectedCategories(next);
                                  setPage(1);
                                  toast.info(
                                    isFiltered
                                      ? `Removed '${cat}' from filter`
                                      : `Added '${cat}' to filter`
                                  );
                                }}
                                title={`Click to toggle filter for '${cat}'`}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-all flex items-center gap-1 cursor-pointer ${
                                  isFiltered
                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                    : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border'
                                }`}
                              >
                                <span>{cat}</span>
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCategoryTx(tx);
                            }}
                            title="Attach / Edit multiple categories"
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Value Impact (Screenshot 2: Bold large -$6.20 or +$653.21) */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <span
                          className={`font-semibold text-sm tracking-tight tabular-nums ${
                            isExpense ? 'text-foreground' : 'text-positive'
                          }`}
                        >
                          {isExpense
                            ? `-$${Math.abs(tx.amount).toLocaleString('en-CA', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : `+$${Math.abs(tx.amount).toLocaleString('en-CA', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setActiveDrawerTx(tx)}
                            title="Inspect Signal"
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetTx(tx)}
                            title="Delete Transaction"
                            className="p-1.5 rounded-lg hover:bg-negative/10 text-muted-foreground hover:text-negative transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Bar: Signal Density & Pagination (Screenshot 2 bottom) */}
        <div className="p-4 px-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          {/* Signal Density Selector (Screenshot 2: 50, 100, Full Mesh) */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              SIGNAL DENSITY:
            </span>
            <div className="inline-flex rounded-lg bg-secondary border border-border p-0.5">
              {[
                { label: '50', val: 50 },
                { label: '100', val: 100 },
                { label: 'Full Mesh', val: 500 },
              ].map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => {
                    setLimit(d.val);
                    setPage(1);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    limit === d.val
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results count & Pagination Controls */}
          <div className="flex items-center gap-4">
            <div>
              Showing{' '}
              <strong className="text-foreground">
                {totalCount > 0 ? (page - 1) * limit + 1 : 0}
              </strong>{' '}
              to{' '}
              <strong className="text-foreground">
                {Math.min(page * limit, totalCount)}
              </strong>{' '}
              of <strong className="text-foreground">{totalCount.toLocaleString()}</strong> signals
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over Transaction Drawer (Fully Interactive & Editable) */}
      <TransactionDrawer
        transaction={activeDrawerTx}
        accounts={accounts}
        allCategories={allCategoryNames}
        onUpdate={(updated) => {
          setActiveDrawerTx(updated);
          queryClient.setQueriesData({ queryKey: ['transactions'] }, (old: any) => {
            if (!old || !Array.isArray(old.transactions)) return old;
            return {
              ...old,
              transactions: old.transactions.map((t: any) =>
                t.id === updated.id ? { ...t, ...updated } : t
              ),
            };
          });
        }}
        onClose={() => setActiveDrawerTx(null)}
        onDelete={() => {
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['accounts'] });
          setActiveDrawerTx(null);
        }}
      />

      {/* In-App Delete Confirmation Modal (Replaces browser confirm) */}
      {deleteTargetTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-negative/15 text-negative flex items-center justify-center border border-negative/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Transaction?</h3>
                <p className="text-xs text-muted-foreground">Running balances will be recalculated</p>
              </div>
            </div>

            <div className="p-3.5 bg-secondary/50 rounded-2xl border border-border/80 space-y-1 text-xs">
              <div className="font-bold text-foreground">{deleteTargetTx.merchant || deleteTargetTx.description}</div>
              <div className="text-muted-foreground flex items-center gap-2">
                <span>{deleteTargetTx.date}</span>
                <span>•</span>
                <span className="font-mono font-bold text-foreground">{formatCAD(deleteTargetTx.amount)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete this transaction from the database? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetTx(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-secondary transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTargetTx.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-negative hover:bg-negative/90 text-negative-foreground shadow-md shadow-negative/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Bulk Categorize Modal (Select from existing categories or create new) */}
      {isBulkCategorizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setIsBulkCategorizeModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Bulk Categorize Transactions</h3>
                <p className="text-xs text-muted-foreground">
                  Apply category to <span className="font-semibold text-foreground">{selectedIds.size}</span> selected transactions ({formatCAD(selectedTotalAmount)})
                </p>
              </div>
            </div>

            {/* Mode selection toggle */}
            <div className="mt-4 p-1 bg-secondary rounded-xl flex items-center gap-1 border border-border">
              <button
                type="button"
                onClick={() => setBulkMode('replace')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  bulkMode === 'replace'
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Replace Categories
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('append')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  bulkMode === 'append'
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Attach / Append to Existing
              </button>
            </div>

            {/* Selected Categories Chips */}
            <div className="mt-3 p-3 rounded-2xl bg-secondary/50 border border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Selected Categories ({bulkSelectedCategories.size}):
                </span>
                {bulkSelectedCategories.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setBulkSelectedCategories(new Set())}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[30px] items-center">
                {bulkSelectedCategories.size === 0 ? (
                  <span className="text-xs text-muted-foreground italic">
                    Select one or more existing categories below, or create a custom one.
                  </span>
                ) : (
                  Array.from(bulkSelectedCategories).map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground shadow-xs animate-in zoom-in-95 duration-150"
                    >
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Set(bulkSelectedCategories);
                          next.delete(c);
                          setBulkSelectedCategories(next);
                        }}
                        className="hover:bg-primary-foreground/20 rounded-full p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Quick Search Existing Categories */}
            <div className="relative mt-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search existing categories..."
                value={bulkCategorySearch}
                onChange={(e) => setBulkCategorySearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-secondary border border-border focus:outline-none focus:border-primary text-foreground"
              />
            </div>

            {/* Existing Categories Scrollable Grid/List */}
            <div className="mt-2 flex-1 overflow-y-auto max-h-56 pr-1 space-y-1 border border-border/60 rounded-xl p-2 bg-secondary/20">
              {allCategoryNames
                .filter((c) =>
                  bulkCategorySearch ? c.toLowerCase().includes(bulkCategorySearch.toLowerCase()) : true
                )
                .map((c) => {
                  const isChecked = bulkSelectedCategories.has(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        const next = new Set(bulkSelectedCategories);
                        if (isChecked) {
                          next.delete(c);
                        } else {
                          next.add(c);
                        }
                        setBulkSelectedCategories(next);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-primary/15 text-primary font-bold border border-primary/30'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground/40 bg-card'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <span>{c}</span>
                      </div>
                      <Tag className="w-3.5 h-3.5 opacity-40" />
                    </button>
                  );
                })}
              {allCategoryNames.filter((c) =>
                bulkCategorySearch ? c.toLowerCase().includes(bulkCategorySearch.toLowerCase()) : true
              ).length === 0 && (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No existing categories found for "{bulkCategorySearch}".
                </div>
              )}
            </div>

            {/* Create Custom Category Input */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="Or create new category..."
                value={bulkInlineNewCat}
                onChange={(e) => setBulkInlineNewCat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && bulkInlineNewCat.trim()) {
                    e.preventDefault();
                    const clean = bulkInlineNewCat.trim();
                    const next = new Set(bulkSelectedCategories);
                    next.add(clean);
                    setBulkSelectedCategories(next);
                    setBulkInlineNewCat('');
                  }
                }}
                className="flex-1 h-9 px-3 text-xs rounded-xl bg-secondary border border-border focus:outline-none focus:border-primary text-foreground"
              />
              <button
                type="button"
                onClick={() => {
                  if (bulkInlineNewCat.trim()) {
                    const clean = bulkInlineNewCat.trim();
                    const next = new Set(bulkSelectedCategories);
                    next.add(clean);
                    setBulkSelectedCategories(next);
                    setBulkInlineNewCat('');
                  }
                }}
                disabled={!bulkInlineNewCat.trim()}
                className="px-3 h-9 text-xs font-semibold rounded-xl bg-secondary border border-border hover:bg-muted disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
              <span className="text-[11px] text-muted-foreground">
                {bulkSelectedCategories.size === 0
                  ? 'Please select at least 1 category'
                  : `${bulkMode === 'replace' ? 'Replacing with' : 'Appending'} ${bulkSelectedCategories.size} category(s)`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkCategorizeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-secondary transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (bulkSelectedCategories.size === 0) return;
                    const catArray = Array.from(bulkSelectedCategories);
                    bulkMutation.mutate({
                      action: 'update',
                      ids: Array.from(selectedIds),
                      categories: catArray,
                      category: catArray.join(', '),
                      mode: bulkMode,
                    });
                    setIsBulkCategorizeModalOpen(false);
                  }}
                  disabled={bulkSelectedCategories.size === 0 || bulkMutation.isPending}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-md shadow-primary/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {bulkMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Apply Category ({selectedIds.size})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Bulk Delete Confirmation Modal (Replaces browser confirm) */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-negative/15 text-negative flex items-center justify-center border border-negative/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Bulk Delete Transactions?</h3>
                <p className="text-xs text-muted-foreground">Running balances will be recalculated</p>
              </div>
            </div>

            <div className="p-3.5 bg-secondary/50 rounded-2xl border border-border/80 space-y-1 text-xs">
              <div className="font-bold text-foreground">{selectedIds.size} transactions selected</div>
              <div className="text-muted-foreground flex items-center gap-2">
                <span>Total Impact:</span>
                <span className="font-mono font-bold text-foreground">{formatCAD(selectedTotalAmount)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete these {selectedIds.size} transactions from the database? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-secondary transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  bulkMutation.mutate({ action: 'delete', ids: Array.from(selectedIds) });
                  setIsBulkDeleteModalOpen(false);
                }}
                disabled={bulkMutation.isPending}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-negative hover:bg-negative/90 text-negative-foreground shadow-md shadow-negative/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {bulkMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{bulkMutation.isPending ? 'Deleting...' : `Delete ${selectedIds.size} Transactions`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Bulk Type Modal (Change classification between Inflow, Outflow, Transfers) */}
      {isBulkTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 relative space-y-4">
            <button
              onClick={() => setIsBulkTypeModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent flex items-center justify-center border border-accent/30">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Bulk Change Transaction Type</h3>
                <p className="text-xs text-muted-foreground">
                  Apply to <span className="font-semibold text-foreground">{selectedIds.size}</span> selected transactions ({formatCAD(selectedTotalAmount)})
                </p>
              </div>
            </div>

            {/* Type Selection Options */}
            <div className="space-y-2 pt-1">
              {/* Option 1: Inflow */}
              <button
                type="button"
                onClick={() => setBulkSelectedType('Inflow')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  bulkSelectedType === 'Inflow'
                    ? 'bg-positive/10 border-positive/40 shadow-sm shadow-positive/10'
                    : 'bg-secondary/40 border-border hover:bg-secondary/70'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    bulkSelectedType === 'Inflow'
                      ? 'bg-positive/20 text-positive border border-positive/30'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <span>Inflow (Income / Deposit)</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-positive/15 text-positive border border-positive/25">
                        + CREDIT
                      </span>
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        bulkSelectedType === 'Inflow'
                          ? 'border-positive bg-positive text-positive-foreground'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {bulkSelectedType === 'Inflow' && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Converts amounts to positive credits (+). Increases cash balances.
                  </p>
                </div>
              </button>

              {/* Option 2: Outflow */}
              <button
                type="button"
                onClick={() => setBulkSelectedType('Outflow')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  bulkSelectedType === 'Outflow'
                    ? 'bg-negative/10 border-negative/40 shadow-sm shadow-negative/10'
                    : 'bg-secondary/40 border-border hover:bg-secondary/70'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    bulkSelectedType === 'Outflow'
                      ? 'bg-negative/20 text-negative border border-negative/30'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <span>Outflow (Expense / Payment)</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-negative/15 text-negative border border-negative/25">
                        - DEBIT
                      </span>
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        bulkSelectedType === 'Outflow'
                          ? 'border-negative bg-negative text-negative-foreground'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {bulkSelectedType === 'Outflow' && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Converts amounts to negative debits (-). Records as expenditure.
                  </p>
                </div>
              </button>

              {/* Option 3: Transfers */}
              <button
                type="button"
                onClick={() => setBulkSelectedType('Transfers')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  bulkSelectedType === 'Transfers'
                    ? 'bg-accent/10 border-accent/40 shadow-sm shadow-accent/10'
                    : 'bg-secondary/40 border-border hover:bg-secondary/70'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    bulkSelectedType === 'Transfers'
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <span>Transfers (Account to Account)</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">
                        ⇆ TRANSFER
                      </span>
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        bulkSelectedType === 'Transfers'
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {bulkSelectedType === 'Transfers' && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Internal transfer between accounts. Preserves underlying magnitude.
                  </p>
                </div>
              </button>
            </div>

            {/* Recalculation Notice */}
            <div className="p-3 bg-secondary/50 rounded-2xl border border-border/80 text-[11px] text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span>
                Account running balances and PostgreSQL database records will update automatically.
              </span>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsBulkTypeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-secondary transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  bulkMutation.mutate({
                    action: 'update',
                    ids: Array.from(selectedIds),
                    type: bulkSelectedType,
                  });
                  setIsBulkTypeModalOpen(false);
                }}
                disabled={bulkMutation.isPending}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-md shadow-primary/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {bulkMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Apply Type ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Category Attachment Dialog */}
      {editingCategoryTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 relative">
            <button
              onClick={() => {
                setEditingCategoryTx(null);
                setCategoryEditSearch('');
                setInlineNewCategory('');
              }}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-foreground">Attach Categories</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3 truncate">
              {editingCategoryTx.merchant || editingCategoryTx.description} (
              {editingCategoryTx.amount < 0 ? '-' : '+'}
              {formatCAD(Math.abs(editingCategoryTx.amount))})
            </p>

            {/* Currently Attached Categories Chips */}
            <div className="mb-3 p-2.5 rounded-2xl bg-secondary/60 border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Attached Categories ({selectedCategorySet.size}):
              </span>
              <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                {selectedCategorySet.size === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No categories attached yet. Select below to attach.</span>
                ) : (
                  Array.from(selectedCategorySet).map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary text-primary-foreground shadow-xs animate-in zoom-in-95 duration-150"
                    >
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Set(selectedCategorySet);
                          next.delete(c);
                          setSelectedCategorySet(next);
                        }}
                        className="hover:bg-primary-foreground/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Quick Filter Search */}
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search categories to attach..."
                value={categoryEditSearch}
                onChange={(e) => setCategoryEditSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-xl bg-secondary border border-border focus:outline-none text-foreground"
              />
            </div>

            {/* Categories Multi-Select List */}
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {allCategoryNames
                .filter((c) =>
                  categoryEditSearch ? c.toLowerCase().includes(categoryEditSearch.toLowerCase()) : true
                )
                .map((c) => {
                  const isChecked = selectedCategorySet.has(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        const next = new Set(selectedCategorySet);
                        if (isChecked) {
                          next.delete(c);
                        } else {
                          next.add(c);
                        }
                        setSelectedCategorySet(next);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'border-border hover:bg-muted text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isChecked
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground/40 bg-card'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <span>{c}</span>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Create & Attach New Custom Category */}
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
              <input
                type="text"
                placeholder="Create new category & attach..."
                value={inlineNewCategory}
                onChange={(e) => setInlineNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inlineNewCategory.trim()) {
                    e.preventDefault();
                    const newCat = inlineNewCategory.trim();
                    addCategoryMutation.mutate(
                      { name: newCat },
                      {
                        onSuccess: (data) => {
                          if (data.success) {
                            setSelectedCategorySet((prev) => new Set([...prev, data.category.name]));
                            setInlineNewCategory('');
                            toast.success(`Category "${data.category.name}" added & attached!`);
                          }
                        },
                      }
                    );
                  }
                }}
                className="flex-1 h-8 px-3 text-xs rounded-xl bg-secondary border border-border focus:outline-none text-foreground"
              />
              <button
                type="button"
                onClick={() => {
                  if (inlineNewCategory.trim()) {
                    const newCat = inlineNewCategory.trim();
                    addCategoryMutation.mutate(
                      { name: newCat },
                      {
                        onSuccess: (data) => {
                          if (data.success) {
                            setSelectedCategorySet((prev) => new Set([...prev, data.category.name]));
                            setInlineNewCategory('');
                            toast.success(`Category "${data.category.name}" added & attached!`);
                          }
                        },
                      }
                    );
                  }
                }}
                className="px-3 h-8 text-xs font-semibold rounded-xl bg-secondary border border-border hover:bg-muted text-foreground transition-all shrink-0"
              >
                + Add
              </button>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setEditingCategoryTx(null);
                  setCategoryEditSearch('');
                  setInlineNewCategory('');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateCategoryMutation.isPending}
                onClick={() => {
                  const catList = Array.from(selectedCategorySet);
                  updateCategoryMutation.mutate({
                    id: editingCategoryTx.id,
                    categories: catList.length > 0 ? catList : ['General'],
                  });
                }}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/25 disabled:opacity-50 flex items-center gap-2"
              >
                {updateCategoryMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  Save Classification ({selectedCategorySet.size} attached)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Category Modal */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAddCategoryModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Add Custom Category</h3>
                <p className="text-xs text-muted-foreground">
                  Create a new category for tagging and filtering transactions
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCategoryName.trim()) {
                  toast.error('Please enter a category name');
                  return;
                }
                addCategoryMutation.mutate({
                  name: newCategoryName.trim(),
                  color: newCategoryColor,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fitness & Gym, Pet Care, Crypto, Freelance"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs rounded-xl bg-secondary border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Color Accent
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    '#3b82f6', // Blue
                    "hsl(var(--positive))", // Emerald
                    '#8b5cf6', // Violet
                    "hsl(var(--warning))", // Amber
                    "hsl(var(--negative))", // Rose
                    '#06b6d4', // Cyan
                    '#6366f1', // Indigo
                    '#ec4899', // Pink
                    '#64748b', // Slate
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        newCategoryColor === color ? 'scale-110 border-foreground shadow-md' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent"
                    title="Choose custom color"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCategoryMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/25 disabled:opacity-50 flex items-center gap-2"
                >
                  {addCategoryMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{addCategoryMutation.isPending ? 'Saving...' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Deletion & Reassociation Modal */}
      {deleteCategoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 relative space-y-4">
            <button
              onClick={() => setDeleteCategoryTarget(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-negative/10 text-negative flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Delete Category: {deleteCategoryTarget.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {deleteCategoryTarget.count} transaction{deleteCategoryTarget.count === 1 ? '' : 's'} currently assigned
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs text-foreground space-y-3">
              <p className="font-semibold text-muted-foreground">
                Do you want to reassign or associate the transactions of this category with another category?
              </p>

              {/* Radio 1: Reassign to existing */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border bg-card cursor-pointer hover:bg-secondary/60 transition-colors">
                <input
                  type="radio"
                  name="deleteReassignMode"
                  checked={deleteReassignMode === 'existing'}
                  onChange={() => setDeleteReassignMode('existing')}
                  className="mt-0.5 cursor-pointer"
                />
                <div className="flex-1 space-y-1">
                  <span className="font-bold block text-foreground">Associate with another existing category</span>
                  {deleteReassignMode === 'existing' && (
                    <select
                      value={deleteReassignTarget}
                      onChange={(e) => setDeleteReassignTarget(e.target.value)}
                      className="w-full mt-1.5 px-3 py-1.5 text-xs rounded-lg bg-card border border-border text-foreground font-semibold focus:outline-none cursor-pointer"
                      style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                    >
                      {allCategoryNames
                        .filter((c) => c !== deleteCategoryTarget.name)
                        .map((c) => (
                          <option key={c} value={c} style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>
                            {c}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </label>

              {/* Radio 2: Create new category */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border bg-card cursor-pointer hover:bg-secondary/60 transition-colors">
                <input
                  type="radio"
                  name="deleteReassignMode"
                  checked={deleteReassignMode === 'new'}
                  onChange={() => setDeleteReassignMode('new')}
                  className="mt-0.5 cursor-pointer"
                />
                <div className="flex-1 space-y-1">
                  <span className="font-bold block text-foreground">Create a new category & associate transactions</span>
                  {deleteReassignMode === 'new' && (
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. Dining Out, Health & Wellness"
                      value={deleteNewCategoryName}
                      onChange={(e) => setDeleteNewCategoryName(e.target.value)}
                      className="w-full mt-1.5 px-3 py-1.5 text-xs rounded-lg bg-secondary border border-border text-foreground font-semibold focus:outline-none"
                    />
                  )}
                </div>
              </label>

              {/* Radio 3: Leave unassigned (General) */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border bg-card cursor-pointer hover:bg-secondary/60 transition-colors">
                <input
                  type="radio"
                  name="deleteReassignMode"
                  checked={deleteReassignMode === 'none'}
                  onChange={() => setDeleteReassignMode('none')}
                  className="mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="font-bold block text-foreground">Remove category without reassigning</span>
                  <span className="text-[11px] text-muted-foreground">Transactions will be reassigned to "General".</span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDeleteCategoryTarget(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deleteCategoryMutation.isPending ||
                  (deleteReassignMode === 'new' && !deleteNewCategoryName.trim())
                }
                onClick={() => {
                  const target =
                    deleteReassignMode === 'existing'
                      ? deleteReassignTarget
                      : deleteReassignMode === 'new'
                      ? deleteNewCategoryName.trim()
                      : 'General';

                  deleteCategoryMutation.mutate({
                    name: deleteCategoryTarget.name,
                    reassignTo: target,
                    newCategoryName: deleteReassignMode === 'new' ? deleteNewCategoryName.trim() : undefined,
                  });
                }}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-negative hover:bg-negative/90 text-negative-foreground transition-all shadow-md shadow-negative/25 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {deleteCategoryMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{deleteCategoryMutation.isPending ? 'Reassociating...' : 'Reassign & Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-xl rounded-3xl border border-border shadow-2xl p-6 relative">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Import Statement CSV</h3>
                <p className="text-xs text-muted-foreground">
                  Paste raw CSV text from your bank export or drag a CSV file
                </p>
              </div>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  CSV Data (with headers: Date, Description, Amount)
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder={`Date,Description,Amount\n2026-10-14,TIM HORTONS #2435,-6.54\n2026-10-13,PAYMENT - THANK YOU,47.00`}
                  value={csvImportText}
                  onChange={(e) => setCsvImportText(e.target.value)}
                  className="w-full p-3 font-mono text-xs rounded-xl bg-muted/60 border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/25 disabled:opacity-50 flex items-center gap-2"
                >
                  {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isImporting ? 'Importing...' : 'Start Import'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
