import React, { useMemo, useState } from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler,
} from 'chart.js';
import { Transaction, Account } from '../types';
import { Search, Activity, PieChart } from 'lucide-react';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler
);

interface FinanceChartsProps {
  transactions: Transaction[];
  accounts: Account[];
  selectedMonth: string;
}

export const FinanceCharts: React.FC<FinanceChartsProps> = ({ transactions, accounts, selectedMonth }) => {
  const [filterType, setFilterType] = useState<'all' | 'assets' | 'debt'>('all');
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const allCategories = useMemo(() => 
    Array.from(new Set(transactions.map(t => t.category))).sort(),
    [transactions]
  );

  const filteredTxs = useMemo(() => {
    let txs = selectedMonth === 'all' 
      ? transactions 
      : transactions.filter(t => t.statementMonth === selectedMonth);

    if (filterType === 'assets') {
      const assetAccountIds = accounts.filter(a => a.type !== 'credit_card').map(a => a.accountId);
      txs = txs.filter(t => assetAccountIds.includes(t.accountId));
    } else if (filterType === 'debt') {
      const debtAccountIds = accounts.filter(a => a.type === 'credit_card').map(a => a.accountId);
      txs = txs.filter(t => debtAccountIds.includes(t.accountId));
    }

    if (excludedCategories.length > 0) {
      txs = txs.filter(t => !excludedCategories.includes(t.category));
    }

    if (searchQuery) {
      txs = txs.filter(t => t.merchant.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return txs;
  }, [transactions, accounts, selectedMonth, filterType, excludedCategories, searchQuery]);

  const expenseTxs = useMemo(() => filteredTxs.filter(t => t.type === 'expense'), [filteredTxs]);

  // Detecting Recurring Signals (Simple pattern matching)
  const recurringSignals = useMemo(() => {
    const merchantMap: Record<string, number[]> = {};
    transactions.forEach(t => {
      if (t.type !== 'expense') return;
      if (!merchantMap[t.merchant]) merchantMap[t.merchant] = [];
      merchantMap[t.merchant].push(new Date(t.timestamp).getTime());
    });

    return Object.entries(merchantMap)
      .filter(([, dates]) => {
        if (dates.length < 2) return false;
        // Check if occurrences are roughly 25-35 days apart
        const sorted = dates.sort();
        let consistent = 0;
        for(let i=1; i<sorted.length; i++) {
          const diff = (sorted[i] - sorted[i-1]) / (1000 * 60 * 60 * 24);
          if (diff >= 25 && diff <= 35) consistent++;
        }
        return consistent >= 1;
      })
      .map(([name]) => name);
  }, [transactions]);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    expenseTxs.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    
    return {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: [
          '#2D34FB', '#8DAA91', '#F6AD55', '#FC8181', '#63B3ED', '#BEE3F8', '#2D3748',
          '#9F7AEA', '#ED64A6', '#48BB78', '#F56565', '#4FD1C5'
        ],
        borderWidth: 0,
        hoverOffset: 10
      }]
    };
  }, [expenseTxs]);

  const cashFlowTrend = useMemo(() => {
    const monthMap: Record<string, { income: number, expense: number }> = {};
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    sortedTxs.forEach(t => {
      if (!t.statementMonth) return;
      if (!monthMap[t.statementMonth]) monthMap[t.statementMonth] = { income: 0, expense: 0 };
      if (t.type === 'income') monthMap[t.statementMonth].income += t.amount;
      if (t.type === 'expense') monthMap[t.statementMonth].expense += t.amount;
    });

    const labels = Object.keys(monthMap).sort();
    return {
      labels: labels.map(l => new Date(l + '-01').toLocaleDateString(undefined, { month: 'short' })),
      datasets: [
        {
          label: 'Asset Inflow',
          data: labels.map(l => monthMap[l].income),
          borderColor: '#8DAA91',
          backgroundColor: '#8DAA9111',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 0
        },
        {
          label: 'Asset Burn',
          data: labels.map(l => monthMap[l].expense),
          borderColor: '#FC8181',
          backgroundColor: '#FC818111',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 0
        }
      ]
    };
  }, [transactions]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    cutout: '70%'
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { display: false },
      x: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' as const } } }
    }
  };

  return (
    <div className="space-y-8 mb-12">
      {/* Advanced Chart Filter Mesh */}
      <div className="bg-white border border-[#E2E8F0] rounded-[32px] p-6 shadow-sm flex flex-wrap items-center gap-6">
        <div className="flex bg-[#F9F7F2] p-1 rounded-xl border border-[#E2E8F0]">
          {(['all', 'assets', 'debt'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg font-lexend font-bold text-[10px] uppercase tracking-widest transition-all ${
                filterType === type ? 'bg-[#2D34FB] text-white shadow-lg shadow-blue-500/20' : 'text-[#718096] hover:text-[#2D3748]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="h-8 w-px bg-[#E2E8F0] hidden md:block" />

        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0AEC0]" />
          <input 
            type="text"
            placeholder="Search Mesh Nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold text-[#2D3748] focus:outline-none focus:border-[#2D34FB]/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar max-w-full md:max-w-[400px]">
          {allCategories.slice(0, 8).map(cat => (
            <button
              key={cat}
              onClick={() => setExcludedCategories(prev => 
                prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
              )}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-tighter transition-all ${
                excludedCategories.includes(cat) 
                  ? 'bg-white text-[#A0AEC0] border-[#E2E8F0] line-through' 
                  : 'bg-white text-[#2D34FB] border-[#2D34FB]/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Flow Mesh */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-[48px] p-8 md:p-10 shadow-xl shadow-black/5 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-lexend font-bold text-xl text-[#2D3748]">Temporal Asset Velocity</h4>
              <p className="text-xs text-[#718096] uppercase font-bold tracking-[0.2em]">Net Inflow vs Asset Burn</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-[#8DAA91]" />
                 <span className="text-[9px] font-bold text-[#718096] uppercase">Inflow</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-[#FC8181]" />
                 <span className="text-[9px] font-bold text-[#718096] uppercase">Burn</span>
               </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <Line 
              data={cashFlowTrend} 
              options={{
                ...lineOptions,
                scales: {
                  y: { display: false },
                  x: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } }
                }
              }} 
            />
          </div>
        </div>

        {/* Category & Recurring Intel */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white border border-[#E2E8F0] rounded-[40px] p-8 shadow-xl shadow-black/5">
             <div className="flex items-center justify-between mb-6">
                <h4 className="font-lexend font-bold text-[#2D3748]">Mesh Segments</h4>
                <PieChart className="w-4 h-4 text-[#2D34FB]" />
             </div>
             <div className="h-64 relative">
                <Doughnut data={categoryData} options={doughnutOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   <span className="text-[10px] font-bold text-[#718096] uppercase tracking-widest">Aggregate Burn</span>
                   <span className="text-2xl font-lexend font-bold text-[#2D3748]">${expenseTxs.reduce((s, t) => s + t.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
             </div>
             <div className="mt-8 grid grid-cols-2 gap-2">
                {categoryData.labels.slice(0, 4).map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryData.datasets[0].backgroundColor[i] }} />
                    <span className="text-[10px] font-bold text-[#718096] truncate">{label}</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-[#2D3748] rounded-[40px] p-8 text-white shadow-xl">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                   <Activity className="w-5 h-5 text-green-400" />
                </div>
                <h4 className="font-lexend font-bold">Recurring Intel</h4>
             </div>
             <div className="space-y-4">
                {recurringSignals.slice(0, 4).map(merchant => (
                  <div key={merchant} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-xs font-medium text-white/80 truncate pr-4">{merchant}</span>
                    <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-green-400 uppercase tracking-widest">Active Signal</span>
                  </div>
                ))}
                {recurringSignals.length === 0 && (
                  <p className="text-xs text-white/40 italic">No recurring mesh signals detected in current temporal window.</p>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
