import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, 
  Download, 
  ChevronLeft,
  ChevronRight,
  Search, 
  Filter, 
  ChevronDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Trash2,
  Plus,
  Settings,
  CalendarRange,
  Banknote,
  LayoutList,
  X,
  Check,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Transaction, Account } from '../types';

interface TransactionExplorerProps {
  transactions: Transaction[];
  accounts: Account[];
  onDeleteAll?: () => void;
  onUpdateTransaction?: (txId: string, updates: Partial<Transaction>) => void;
  onDeleteTransaction?: (txId: string) => void;
  onAddTransaction?: (tx: Omit<Transaction, 'txId'>) => void;
}

export const TransactionExplorer: React.FC<TransactionExplorerProps> = ({ 
  transactions, 
  accounts, 
  onDeleteAll,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddTransaction
}) => {
  const [search, setSearch] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(['all']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortByOrder] = useState<'asc' | 'desc'>('desc');
  const [viewCount, setViewCount] = useState(25);
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [currentPage, setCurrentPage] = useState(1);
  
  // New Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d' | 'ytd' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAuditSignals, setShowAuditSignals] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'accounts' | 'categories' | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [transactions]);

  const statuses = useMemo(() => {
    const stats = new Set<string>();
    transactions.forEach(t => {
      if (t.status) stats.add(t.status);
    });
    return Array.from(stats).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let rangeLimitStart: Date | null = null;
    let rangeLimitEnd: Date | null = null;

    if (dateRange === '7d') rangeLimitStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (dateRange === '30d') rangeLimitStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (dateRange === '90d') rangeLimitStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else if (dateRange === 'ytd') rangeLimitStart = new Date(new Date().getFullYear(), 0, 1);
    else if (dateRange === 'custom' && customStartDate && customEndDate) {
      rangeLimitStart = new Date(customStartDate);
      rangeLimitEnd = new Date(customEndDate);
      rangeLimitEnd.setHours(23, 59, 59, 999);
    }

    return transactions
      .filter(t => {
        const matchesSearch = t.merchant.toLowerCase().includes(search.toLowerCase()) || 
                             t.category?.toLowerCase().includes(search.toLowerCase());
        const matchesAccount = selectedAccounts.includes('all') || selectedAccounts.includes(t.accountId);
        const matchesCategory = selectedCategories.includes('all') || selectedCategories.includes(t.category);
        const matchesType = selectedType === 'all' || t.type === selectedType;
        const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
        
        // Audit Signal Filter
        const isInternalOrExcluded = t.type === 'internal_transfer' || t.status === 'Excluded';
        if (!showAuditSignals && isInternalOrExcluded) return false;

        // Amount Filter
        const amount = Math.abs(t.amount);
        const matchesMin = minAmount === '' || amount >= parseFloat(minAmount);
        const matchesMax = maxAmount === '' || amount <= parseFloat(maxAmount);
        
        // Date Filter
        const txDate = new Date(t.timestamp);
        let matchesDate = true;
        if (rangeLimitStart) matchesDate = txDate >= rangeLimitStart;
        if (rangeLimitEnd) matchesDate = matchesDate && txDate <= rangeLimitEnd;

        return matchesSearch && matchesAccount && matchesCategory && matchesType && matchesStatus && matchesMin && matchesMax && matchesDate;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          const dateA = new Date(a.timestamp).getTime();
          const dateB = new Date(b.timestamp).getTime();
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        } else {
          return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
        }
      });
  }, [transactions, search, selectedAccounts, selectedCategories, selectedType, sortBy, sortOrder, minAmount, maxAmount, dateRange, customStartDate, customEndDate, selectedStatus]);

  const visibleTransactions = filteredTransactions.slice(0, viewCount);

  const paginatedTransactions = useMemo(() => {
    if (pageSize === 'all') return filteredTransactions;
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.ceil(filteredTransactions.length / pageSize);
  }, [filteredTransactions, pageSize]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Account', 'Description', 'Amount', 'Type', 'Category'];
    const rows = filteredTransactions.map(t => [
      new Date(t.timestamp).toLocaleDateString(),
      t.merchant,
      t.amount,
      t.type,
      t.category
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mesh_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWipe = async () => {
    if (!onDeleteAll) return;
    setIsWiping(true);
    await onDeleteAll();
    setIsWiping(false);
  };

  return (
    <div className="space-y-8">
      {/* Signal Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 bg-white border border-[#E2E8F0] rounded-[40px] p-8 shadow-xl shadow-black/5">
        <div className="space-y-2">
          <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">Signal Count</label>
          <div className="text-3xl font-lexend font-bold text-[#2D3748]">{filteredTransactions.length}</div>
        </div>
        <div className="space-y-2 border-l border-[#F1F5F9] pl-6">
          <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">Inflow</label>
          <div className="text-3xl font-lexend font-bold text-[#8DAA91]">
            ${filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="space-y-2 border-l border-[#F1F5F9] pl-6">
          <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">Outflow</label>
          <div className="text-3xl font-lexend font-bold text-red-500">
            ${filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="space-y-2 border-l border-[#F1F5F9] pl-6">
          <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">Aggregate</label>
          <div className="text-3xl font-lexend font-bold text-[#2D3748]">
            ${filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="space-y-2 border-l border-[#F1F5F9] pl-6">
          <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">Net Impact</label>
          <div className={`text-3xl font-lexend font-bold ${
            filteredTransactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0) >= 0 ? 'text-[#8DAA91]' : 'text-red-500'
          }`}>
            {filteredTransactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0) >= 0 ? '+' : ''}
            ${filteredTransactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-[40px] p-8 shadow-xl shadow-black/5 space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#718096]" />
            <input 
              type="text"
              placeholder="Search merchants, categories, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl pl-16 pr-6 py-4 font-medium focus:outline-none focus:ring-4 focus:ring-[#2D34FB]/5 transition-all"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex bg-[#F9F7F2] p-1 rounded-2xl border border-[#E2E8F0] print:hidden">
              <button 
                onClick={handlePrint}
                className="p-3 hover:bg-white rounded-xl transition-all text-[#718096] hover:text-[#2D34FB]"
                title="Print Mesh"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button 
                onClick={handleExportCSV}
                className="p-3 hover:bg-white rounded-xl transition-all text-[#718096] hover:text-[#2D34FB]"
                title="Export CSV"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-bold text-[#2D3748] focus:outline-none cursor-pointer hover:border-[#2D34FB]/30 transition-all"
            >
              <option value="all">All Signals</option>
              <option value="expense">Asset Burn (Expense)</option>
              <option value="income">Value Gain (Income)</option>
              <option value="internal_transfer">Internal Flow (Transfer)</option>
            </select>

            <button 
              onClick={() => setShowAuditSignals(!showAuditSignals)}
              className={`px-6 py-4 border rounded-2xl font-bold transition-all flex items-center gap-3 ${
                showAuditSignals ? 'bg-[#8DAA91] text-white border-[#8DAA91]' : 'bg-white text-[#718096] border-[#E2E8F0] hover:bg-[#F9F7F2]'
              }`}
              title="Reveal transfers and excluded signals for audit"
            >
              <Layers className={`w-5 h-5 ${showAuditSignals ? 'animate-pulse' : ''}`} />
              {showAuditSignals ? 'Audit Mode: ON' : 'Audit Mode'}
            </button>

            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-6 py-4 border rounded-2xl font-bold transition-all flex items-center gap-2 ${
                showAdvanced ? 'bg-[#2D34FB] text-white border-[#2D34FB]' : 'bg-white text-[#718096] border-[#E2E8F0] hover:bg-[#F9F7F2]'
              }`}
            >
              <Filter className="w-5 h-5" />
              {showAdvanced ? 'Hide Mesh Filters' : 'Advanced Filters'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-[#F1F5F9]">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">
                    <CalendarRange className="w-3 h-3" />
                    Temporal Window
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'All' },
                      { id: '7d', label: '7D' },
                      { id: '30d', label: '30D' },
                      { id: '90d', label: '90D' },
                      { id: 'ytd', label: 'YTD' },
                      { id: 'custom', label: 'Custom' }
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => setDateRange(btn.id as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          dateRange === btn.id ? 'bg-[#2D34FB] text-white' : 'bg-[#F9F7F2] text-[#718096] hover:bg-[#E2E8F0]'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  {dateRange === 'custom' && (
                    <div className="flex items-center gap-2 mt-3 p-3 bg-[#F9F7F2] rounded-2xl border border-[#E2E8F0]">
                      <input 
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="bg-white px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-[10px] font-bold text-[#2D3748] focus:outline-none w-full"
                      />
                      <span className="text-[#718096] font-bold text-[10px]">to</span>
                      <input 
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="bg-white px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-[10px] font-bold text-[#2D3748] focus:outline-none w-full"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">
                    <Banknote className="w-3 h-3" />
                    Magnitude Filter
                  </label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      placeholder="Min"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
                    />
                    <div className="h-px w-4 bg-[#E2E8F0]" />
                    <input 
                      type="number"
                      placeholder="Max"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">
                    <Trash2 className="w-3 h-3" />
                    Mesh Maintenance
                  </label>
                  <button 
                    onClick={handleWipe}
                    disabled={isWiping}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all disabled:opacity-50"
                  >
                    {isWiping ? (
                      <div className="w-4 h-4 border-2 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Wipe Transaction Mesh
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] rounded-full text-[10px] font-bold text-[#718096] uppercase tracking-widest">
            <LayoutList className="w-3 h-3" />
            Active Filters:
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'accounts' ? null : 'accounts')}
              className={`px-4 py-2 border rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                selectedAccounts.includes('all') ? 'bg-white border-[#E2E8F0] text-[#2D3748]' : 'bg-[#2D34FB] text-white border-[#2D34FB]'
              }`}
            >
              {selectedAccounts.includes('all') ? 'All Accounts' : `${selectedAccounts.length} Accounts`}
              <ChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === 'accounts' ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {activeDropdown === 'accounts' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full mb-2 left-0 w-64 bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl z-50 p-2 overflow-hidden"
                >
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    <button
                      onClick={() => {
                        setSelectedAccounts(['all']);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F7F2] text-xs font-bold flex items-center justify-between"
                    >
                      All Accounts
                      {selectedAccounts.includes('all') && <Check className="w-3 h-3 text-[#2D34FB]" />}
                    </button>
                    <div className="h-px bg-[#F1F5F9] my-1" />
                    {accounts.map(acc => {
                      const isSelected = selectedAccounts.includes(acc.accountId);
                      return (
                        <button
                          key={acc.accountId}
                          onClick={() => {
                            let next = [...selectedAccounts.filter(a => a !== 'all')];
                            if (isSelected) next = next.filter(a => a !== acc.accountId);
                            else next.push(acc.accountId);
                            if (next.length === 0) next = ['all'];
                            setSelectedAccounts(next);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F7F2] text-xs font-medium flex items-center justify-between transition-colors ${
                            isSelected ? 'text-[#2D34FB] bg-[#2D34FB]/5' : 'text-[#718096]'
                          }`}
                        >
                          <span className="truncate">{acc.name}</span>
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'categories' ? null : 'categories')}
              className={`px-4 py-2 border rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                selectedCategories.includes('all') ? 'bg-white border-[#E2E8F0] text-[#2D3748]' : 'bg-[#2D34FB] text-white border-[#2D34FB]'
              }`}
            >
              {selectedCategories.includes('all') ? 'All Categories' : `${selectedCategories.length} Categories`}
              <ChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === 'categories' ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {activeDropdown === 'categories' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full mb-2 left-0 w-64 bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl z-50 p-2 overflow-hidden"
                >
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    <button
                      onClick={() => {
                        setSelectedCategories(['all']);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F7F2] text-xs font-bold flex items-center justify-between"
                    >
                      All Categories
                      {selectedCategories.includes('all') && <Check className="w-3 h-3 text-[#2D34FB]" />}
                    </button>
                    <div className="h-px bg-[#F1F5F9] my-1" />
                    {categories.map(cat => {
                      const isSelected = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            let next = [...selectedCategories.filter(c => c !== 'all')];
                            if (isSelected) next = next.filter(c => c !== cat);
                            else next.push(cat);
                            if (next.length === 0) next = ['all'];
                            setSelectedCategories(next);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F7F2] text-xs font-medium flex items-center justify-between transition-colors ${
                            isSelected ? 'text-[#2D34FB] bg-[#2D34FB]/5' : 'text-[#718096]'
                          }`}
                        >
                          <span className="truncate">{cat}</span>
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-full text-xs font-bold text-[#2D3748] focus:outline-none cursor-pointer hover:border-[#2D34FB]/30 transition-all"
          >
            <option value="all">All Statuses</option>
            {statuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <div className="flex items-center border border-[#E2E8F0] rounded-full overflow-hidden">
            <button 
              onClick={() => {
                if (sortBy === 'date') setSortByOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else setSortBy('date');
              }}
              className={`px-4 py-2 text-xs font-bold transition-all ${sortBy === 'date' ? 'bg-[#2D34FB] text-white' : 'bg-white text-[#718096]'}`}
            >
              Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button 
              onClick={() => {
                if (sortBy === 'amount') setSortByOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else setSortBy('amount');
              }}
              className={`px-4 py-2 text-xs font-bold transition-all ${sortBy === 'amount' ? 'bg-[#2D34FB] text-white' : 'bg-white text-[#718096]'}`}
            >
              Amount {sortBy === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>

          <button 
            onClick={() => {
              setSearch('');
              setSelectedAccounts(['all']);
              setSelectedCategories(['all']);
              setSelectedType('all');
              setSelectedStatus('all');
              setMinAmount('');
              setMaxAmount('');
              setDateRange('all');
              setCustomStartDate('');
              setCustomEndDate('');
              setActiveDropdown(null);
            }}
            className="px-4 py-2 text-xs font-bold text-[#718096] hover:text-[#2D3748] transition-all"
          >
            Reset Mesh
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-[#2D34FB] text-white rounded-full text-xs font-bold hover:bg-black transition-all shadow-lg shadow-[#2D34FB]/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Signal
          </button>
        </div>
      </div>

      {/* Results Table / List */}
      <div className="bg-white border border-[#E2E8F0] rounded-[40px] overflow-hidden shadow-2xl shadow-black/5">
        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9F7F2] border-b border-[#E2E8F0]">
                <th className="px-8 py-6 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">Transaction Date</th>
                <th className="px-8 py-6 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">Source Node</th>
                <th className="px-8 py-6 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">Merchant / Description</th>
                <th className="px-8 py-6 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">Classification</th>
                <th className="px-8 py-6 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em] text-right">Value Impact</th>
                <th className="px-8 py-6 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {paginatedTransactions.map((tx) => {
                const account = accounts.find(a => a.accountId === tx.accountId);
                return (
                  <motion.tr 
                    layout
                    key={tx.txId} 
                    className="hover:bg-[#F9F7F2]/50 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white border border-[#E2E8F0] rounded-lg text-[#718096]">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <span className="font-lexend font-bold text-[#2D3748]">
                          {new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {account?.type === 'credit_card' ? <CreditCard className="w-3 h-3 text-[#2D34FB]" /> : <Building2 className="w-3 h-3 text-[#2D34FB]" />}
                        <span className="text-xs font-bold text-[#718096]">{account?.name || 'Unknown Node'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1 max-w-xs">
                        <p className="font-lexend font-bold text-[#2D3748] group-hover:text-[#2D34FB] transition-colors">{tx.merchant}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {tx.status && <p className="text-[9px] text-[#A0AEC0] uppercase font-bold tracking-widest">{tx.status}</p>}
                          {tx.isImpulse && <p className="text-[9px] text-red-500 uppercase font-extrabold tracking-widest bg-red-50 px-1 rounded">Impulse</p>}
                        </div>
                        {tx.notes && <p className="text-[10px] text-[#718096] italic line-clamp-1 group-hover:line-clamp-none transition-all">{tx.notes}</p>}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <span className="px-3 py-1 bg-[#F1F5F9] rounded-full text-[10px] font-bold text-[#718096] uppercase tracking-widest border border-[#E2E8F0]">
                          {tx.category}
                        </span>
                        {tx.subcategory && (
                          <p className="text-[9px] text-[#A0AEC0] uppercase font-bold tracking-widest pl-2">
                            {tx.subcategory}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className={`px-8 py-6 text-right font-lexend font-bold text-lg ${
                      tx.type === 'income' ? "text-green-600" : tx.type === 'internal_transfer' ? "text-[#718096]" : "text-[#2D3748]"
                    }`}>
                      {tx.type === 'income' ? '+' : tx.type === 'internal_transfer' ? '⇄' : '-'}${(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingTx(tx)}
                          className="p-2 text-[#718096] hover:text-[#2D34FB] hover:bg-[#2D34FB]/5 rounded-lg transition-all"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm('Purge this signal from the mesh?')) {
                              onDeleteTransaction?.(tx.txId);
                            }
                          }}
                          className="p-2 text-[#718096] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden divide-y divide-[#F1F5F9]">
          {paginatedTransactions.map((tx) => {
            const account = accounts.find(a => a.accountId === tx.accountId);
            return (
              <motion.div 
                layout
                key={tx.txId}
                className="p-6 space-y-4 hover:bg-[#F9F7F2]/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-lexend font-bold text-[#2D3748] leading-tight">{tx.merchant}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#718096] uppercase tracking-widest">{new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <div className="w-1 h-1 rounded-full bg-[#E2E8F0]" />
                      <span className="text-[10px] font-bold text-[#2D34FB] uppercase tracking-widest">{account?.name}</span>
                    </div>
                  </div>
                  <div className={`font-lexend font-bold text-lg ${
                    tx.type === 'income' ? "text-green-600" : tx.type === 'internal_transfer' ? "text-[#718096]" : "text-[#2D3748]"
                  }`}>
                    {tx.type === 'income' ? '+' : tx.type === 'internal_transfer' ? '⇄' : '-'}${(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-[#F1F5F9] rounded-full text-[9px] font-bold text-[#718096] uppercase tracking-widest border border-[#E2E8F0]">
                    {tx.category}
                  </span>
                  {tx.status && <span className="text-[9px] text-[#A0AEC0] uppercase font-bold tracking-widest">{tx.status}</span>}
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-20 h-20 bg-[#F9F7F2] rounded-full flex items-center justify-center mx-auto">
              <Layers className="w-10 h-10 text-[#CBD5E0]" />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-lexend font-bold text-[#2D3748]">No signals found</p>
              <p className="text-[#718096]">Try adjusting your search or filters to locate data nodes.</p>
            </div>
          </div>
        ) : (
          <div className="p-8 border-t border-[#F1F5F9] flex flex-col md:flex-row items-center justify-between gap-6 bg-[#F9F7F2]/30 print:hidden">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-[#718096] uppercase tracking-[0.2em]">Signal Density</span>
              <div className="flex bg-white rounded-xl border border-[#E2E8F0] p-1 shadow-sm">
                {[50, 100, 'all'].map(size => (
                  <button
                    key={size}
                    onClick={() => {
                      setPageSize(size as any);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      pageSize === size 
                      ? 'bg-[#2D34FB] text-white shadow-md' 
                      : 'text-[#718096] hover:text-[#2D34FB]'
                    }`}
                  >
                    {size === 'all' ? 'Full Mesh' : size}
                  </button>
                ))}
              </div>
            </div>

            {pageSize !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-2 rounded-xl border border-[#E2E8F0] bg-white text-[#2D3748] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#2D34FB]/30 transition-all shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-1.5 px-4">
                  <span className="text-xs font-bold text-[#2D3748]">Page</span>
                  <span className="w-8 h-8 flex items-center justify-center bg-white border border-[#2D34FB] rounded-lg text-xs font-bold text-[#2D34FB] shadow-sm">
                    {currentPage}
                  </span>
                  <span className="text-xs font-bold text-[#718096]">of {totalPages}</span>
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-xl border border-[#E2E8F0] bg-white text-[#2D3748] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#2D34FB]/30 transition-all shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] font-bold text-[#718096] uppercase tracking-widest px-4">
        <span>Showing {Math.min(viewCount, filteredTransactions.length)} of {filteredTransactions.length} recorded signals</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Value Gain
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#2D3748]" />
            Asset Burn
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#718096]" />
            Internal Flow
          </div>
        </div>
      </div>
      <AnimatePresence>
        {(showAddModal || editingTx) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddModal(false);
                setEditingTx(null);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-lexend font-bold text-[#2D3748]">
                    {editingTx ? 'Calibrate Signal' : 'Inject Signal'}
                  </h3>
                  <button 
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingTx(null);
                    }}
                    className="p-2 hover:bg-[#F9F7F2] rounded-xl transition-all text-[#718096]"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <TransactionForm 
                  initialData={editingTx || undefined}
                  accounts={accounts}
                  onSave={(data) => {
                    if (editingTx) {
                      onUpdateTransaction?.(editingTx.txId, data);
                    } else {
                      onAddTransaction?.(data as any);
                    }
                    setShowAddModal(false);
                    setEditingTx(null);
                  }}
                  onCancel={() => {
                    setShowAddModal(false);
                    setEditingTx(null);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface TransactionFormProps {
  initialData?: Transaction;
  accounts: Account[];
  onSave: (data: Partial<Transaction>) => void;
  onCancel: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ initialData, accounts, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Transaction>>(initialData || {
    accountId: accounts[0]?.accountId || '',
    amount: 0,
    type: 'expense',
    category: 'Uncategorized',
    subcategory: '',
    merchant: '',
    timestamp: new Date().toISOString(),
    isImpulse: false,
    status: 'Posted',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[#718096] uppercase tracking-widest px-1">Source Node</label>
          <select 
            value={formData.accountId}
            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
            className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#2D3748]"
            required
          >
            {accounts.map(a => (
              <option key={a.accountId} value={a.accountId}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[#718096] uppercase tracking-widest px-1">Value Flow</label>
          <select 
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#2D3748]"
          >
            <option value="expense">Asset Burn (Expense)</option>
            <option value="income">Value Gain (Income)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[#718096] uppercase tracking-widest px-1">Magnitude ($)</label>
          <input 
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
            className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#2D3748]"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[#718096] uppercase tracking-widest px-1">Temporal Stamp</label>
          <input 
            type="date"
            value={formData.timestamp?.split('T')[0]}
            onChange={(e) => setFormData({ ...formData, timestamp: new Date(e.target.value).toISOString() })}
            className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#2D3748]"
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold text-[#718096] uppercase tracking-widest px-1">Entity / Merchant</label>
        <input 
          type="text"
          value={formData.merchant}
          onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
          className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#2D3748]"
          placeholder="Enter merchant name..."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[#718096] uppercase tracking-widest px-1">Primary Class</label>
          <input 
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#2D3748]"
            placeholder="e.g. Food, Salary..."
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[#718096] uppercase tracking-widest px-1">Sub-Class</label>
          <input 
            type="text"
            value={formData.subcategory}
            onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
            className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#2D3748]"
            placeholder="e.g. Grocery, Bonus..."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[#718096] uppercase tracking-widest px-1">Processing Status</label>
          <select 
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#2D3748]"
          >
            <option value="Posted">Posted</option>
            <option value="Pending">Pending</option>
            <option value="Declined">Declined</option>
          </select>
        </div>
        <div className="flex items-center gap-3 pt-6 px-2">
          <input 
            type="checkbox"
            id="isImpulse"
            checked={formData.isImpulse}
            onChange={(e) => setFormData({ ...formData, isImpulse: e.target.checked })}
            className="w-5 h-5 rounded-lg border-[#E2E8F0] text-[#2D34FB] focus:ring-[#2D34FB]"
          />
          <label htmlFor="isImpulse" className="text-xs font-bold text-[#718096] uppercase tracking-widest cursor-pointer">Impulse Signal</label>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold text-[#718096] uppercase tracking-widest px-1">Signal Meta-Data (Notes)</label>
        <textarea 
          value={formData.notes as string || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#2D3748] h-24"
          placeholder="Detailed transaction notes..."
        />
      </div>

      <div className="flex items-center gap-4 pt-4">
        <button 
          type="submit"
          className="flex-1 bg-[#2D34FB] text-white rounded-2xl py-4 font-lexend font-bold text-sm hover:bg-black transition-all shadow-xl shadow-[#2D34FB]/20"
        >
          {initialData ? 'Calibrate Mesh' : 'Confirm Injection'}
        </button>
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 bg-[#F1F5F9] text-[#718096] rounded-2xl py-4 font-lexend font-bold text-sm hover:bg-[#E2E8F0] transition-all"
        >
          Abort
        </button>
      </div>
    </form>
  );
};
