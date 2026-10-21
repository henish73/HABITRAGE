import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  TrendingUp, 
  Upload,
  ShieldCheck,
  Building2,
  Calendar,
  Filter,
  AlertTriangle,
  Info,
  Shield,
  Clock,
  PieChart,
  Settings,
  Trash2,
  PlusCircle
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { Account, Transaction } from '../types';
import { FinanceCharts } from './FinanceCharts';
import { PurchaseFrictionModal } from './PurchaseFrictionModal';
import { TransactionExplorer } from './TransactionExplorer';

interface FinanceEngineProps {
  userId: string;
  accounts: Account[];
  transactions: Transaction[];
  onAddAccount: () => void;
  onEditAccount: (account: Account) => void;
  onUpdateAccount: (account: Account) => void;
  onIngest: (mode: 'bank' | 'credit') => void;
  onBulkIngest: (type: 'bank' | 'credit') => void;
  onDeleteAllTransactions?: () => void;
  onAddTransaction: (tx: Omit<Transaction, 'txId'>) => void;
  onUpdateTransaction: (txId: string, updates: Partial<Transaction>) => void;
  onDeleteTransaction: (txId: string) => void;
  openRouterKey: string;
  recoveryScore?: number;
}

export const FinanceEngine: React.FC<FinanceEngineProps> = ({ 
  userId, 
  accounts, 
  transactions, 
  onAddAccount,
  onEditAccount,
  onUpdateAccount,
  onIngest,
  onBulkIngest,
  onDeleteAllTransactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  openRouterKey,
  recoveryScore = 100
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showFriction, setShowFriction] = useState(false);

  const statementMonthStr = useMemo(() => 
    `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`,
    [selectedMonth, selectedYear]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.statementMonth === statementMonthStr);
  }, [transactions, statementMonthStr]);

  const totalCash = useMemo(() => 
    accounts.filter(a => a.type !== 'credit_card')
      .reduce((sum, a) => sum + (a.startingBalance || 0), 0), 
  [accounts]);

  const totalDebt = useMemo(() => 
    accounts.filter(a => a.type === 'credit_card')
      .reduce((sum, a) => sum + (a.startingBalance || 0), 0), 
  [accounts]);

  const netLiquidity = totalCash - totalDebt;

  const monthlyRevenue = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const monthlyExpenses = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const netSignalImpact = monthlyRevenue - monthlyExpenses;

  // Mocking hours for EHR calculation - in a real app these would come from shifts
  const monthlyHours = 160; 
  const ehr = monthlyHours > 0 ? monthlyRevenue / monthlyHours : 0;

  return (
    <div className="space-y-8 md:space-y-12">
      {/* Mesh Control Mesh */}
      <div className="bg-white border border-[#E2E8F0] rounded-[48px] p-8 md:p-12 shadow-2xl shadow-black/5 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#2D34FB]/5 rounded-full w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2D34FB]" />
              <span className="text-[10px] font-lexend font-bold text-[#2D34FB] uppercase tracking-widest">Mesh Protocol Active</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-lexend font-bold text-[#2D3748] tracking-tight">Temporal Node Sync</h2>
            <p className="text-[#718096] max-w-lg font-medium">Select a temporal period to synchronize monthly bank and credit card signals into the mesh.</p>
          </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4 bg-[#F9F7F2] p-4 rounded-3xl border border-[#E2E8F0] w-full md:w-auto">
                 <div className="p-3 bg-white rounded-2xl shadow-sm text-[#2D34FB]">
                    <Calendar className="w-6 h-6" />
                 </div>
                 <div className="flex gap-2">
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="bg-transparent font-lexend font-bold text-[#2D3748] focus:outline-none cursor-pointer text-lg"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2000, i).toLocaleDateString(undefined, { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="bg-transparent font-lexend font-bold text-[#2D3748] focus:outline-none cursor-pointer text-lg"
                    >
                      {[2023, 2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                 </div>
              </div>
              
              {onDeleteAllTransactions && (
                <button 
                  onClick={() => {
                    console.log("Reset button clicked in FinanceEngine");
                    onDeleteAllTransactions();
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border border-red-200"
                >
                  <Trash2 className="w-3 h-3" />
                  Reset All Node Data
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {/* Inflow Metric */}
           <div className="bg-white border border-[#E2E8F0] p-8 rounded-[40px] shadow-xl shadow-black/5">
             <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                 <ArrowUpRight className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Mesh Inflow</p>
                 <h4 className="text-2xl font-lexend font-bold text-[#2D3748]">${monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
               </div>
             </div>
             <p className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-widest">Total Value Ingress</p>
           </div>

           {/* Outflow Metric */}
           <div className="bg-white border border-[#E2E8F0] p-8 rounded-[40px] shadow-xl shadow-black/5">
             <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                 <ArrowDownRight className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Mesh Outflow</p>
                 <h4 className="text-2xl font-lexend font-bold text-[#2D3748]">${monthlyExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
               </div>
             </div>
             <p className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-widest">Total Asset Burn</p>
           </div>

           {/* Net Impact */}
           <div className="bg-white border border-[#E2E8F0] p-8 rounded-[40px] shadow-xl shadow-black/5">
             <div className="flex items-center gap-4 mb-4">
               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${netSignalImpact >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                 <TrendingUp className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Net Signal Impact</p>
                 <h4 className={`text-2xl font-lexend font-bold ${netSignalImpact >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                   {netSignalImpact >= 0 ? '+' : ''}${netSignalImpact.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                 </h4>
               </div>
             </div>
             <p className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-widest">Monthly Mesh Delta</p>
           </div>

           {/* EHR / Velocity */}
           <div className="bg-white border border-[#E2E8F0] p-8 rounded-[40px] shadow-xl shadow-black/5">
             <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                 <Clock className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Velocity (EHR)</p>
                 <h4 className="text-2xl font-lexend font-bold text-[#2D3748]">${ehr.toLocaleString(undefined, { minimumFractionDigits: 2 })}/hr</h4>
               </div>
             </div>
             <p className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-widest">Efficiency Rating</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <button 
             onClick={() => onBulkIngest('bank')}
             className="group relative overflow-hidden bg-[#8DAA91] text-white p-8 rounded-[40px] text-left hover:bg-black transition-all shadow-2xl shadow-[#8DAA91]/30 active:scale-[0.98]"
           >
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Building2 className="w-40 h-40 -mr-12 -mt-12" />
             </div>
             <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 bg-white/20 rounded-[22px] flex items-center justify-center text-white">
                   <PlusCircle className="w-8 h-8" />
                </div>
                <div>
                   <h4 className="font-lexend font-bold text-xl">Bulk Bank</h4>
                   <p className="text-white/70 text-xs mt-1">Sync all bank nodes at once.</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-white uppercase tracking-widest">
                   <ArrowUpRight className="w-4 h-4" />
                   Matrix Sync
                </div>
             </div>
           </button>

           <button 
             onClick={() => onBulkIngest('credit')}
             className="group relative overflow-hidden bg-[#2D34FB] text-white p-8 rounded-[40px] text-left hover:bg-black transition-all shadow-2xl shadow-[#2D34FB]/30 active:scale-[0.98]"
           >
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <TrendingUp className="w-40 h-40 -mr-12 -mt-12" />
             </div>
             <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 bg-white/20 rounded-[22px] flex items-center justify-center text-white">
                   <PlusCircle className="w-8 h-8" />
                </div>
                <div>
                   <h4 className="font-lexend font-bold text-xl">Bulk Credit</h4>
                   <p className="text-white/70 text-xs mt-1">Sync all card nodes at once.</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-white uppercase tracking-widest">
                   <ArrowUpRight className="w-4 h-4" />
                   Matrix Sync
                </div>
             </div>
           </button>
        </div>
      
      {/* Accounts Management */}
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-3xl font-lexend font-bold text-[#2D3748] tracking-tight">Financial Nodes</h3>
            <p className="text-sm text-[#718096]">Structural distribution of your strategic capital mesh.</p>
          </div>
          <button 
            onClick={onAddAccount}
            className="flex items-center justify-center gap-3 bg-white border border-[#E2E8F0] px-8 py-4 rounded-[24px] font-lexend font-bold text-sm text-[#718096] hover:border-[#2D34FB]/30 transition-all active:scale-95 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Node Provisioning
          </button>
        </div>

        {/* Grouped Accounts */}
        <div className="space-y-12">
          {/* Asset Mesh */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#8DAA91] rounded-full" />
              <h4 className="font-lexend font-bold text-lg text-[#2D3748]">Asset Mesh <span className="text-[#718096] text-sm font-medium ml-2">({accounts.filter(a => a.type !== 'credit_card').length} nodes)</span></h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
              {accounts.filter(a => a.type !== 'credit_card').map((account) => (
                <AccountNodeCard 
                  key={account.accountId} 
                  account={account} 
                  transactions={transactions}
                  onEdit={onEditAccount} 
                  onUpdate={onUpdateAccount}
                />
              ))}
            </div>
          </div>

          {/* Debt Mesh */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#FC8181] rounded-full" />
              <h4 className="font-lexend font-bold text-lg text-[#2D3748]">Strategic Debt Mesh <span className="text-[#718096] text-sm font-medium ml-2">({accounts.filter(a => a.type === 'credit_card').length} nodes)</span></h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
              {accounts.filter(a => a.type === 'credit_card').map((account) => (
                <AccountNodeCard 
                  key={account.accountId} 
                  account={account} 
                  transactions={transactions}
                  onEdit={onEditAccount} 
                  onUpdate={onUpdateAccount}
                />
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* Transaction Feed Explorer */}
      <div className="space-y-8 pt-8 border-t border-[#E2E8F0]">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-2xl font-lexend font-bold text-[#2D3748]">Mesh Transaction Explorer</h3>
            <p className="text-sm text-[#718096]">Search, filter, and analyze every data point in your capital network.</p>
          </div>
        </div>
        
        <TransactionExplorer 
          transactions={transactions} 
          accounts={accounts} 
          onDeleteAll={onDeleteAllTransactions}
          onAddTransaction={onAddTransaction}
          onUpdateTransaction={onUpdateTransaction}
          onDeleteTransaction={onDeleteTransaction}
        />
      </div>

      <PurchaseFrictionModal 
        userId={userId}
        isOpen={showFriction}
        onClose={() => setShowFriction(false)}
        ehr={ehr}
        recoveryScore={recoveryScore}
      />
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

const AccountNodeCard: React.FC<{ 
  account: Account, 
  transactions: Transaction[],
  onEdit: (a: Account) => void,
  onUpdate: (a: Account) => void
}> = ({ account, transactions, onEdit, onUpdate }) => {
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState(account.startingBalance?.toString() || '0');

  const accountTransactions = useMemo(() => 
    transactions.filter(t => t.accountId === account.accountId),
  [transactions, account.accountId]);

  const accountInflow = useMemo(() => 
    accountTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
  [accountTransactions]);

  const accountOutflow = useMemo(() => 
    accountTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
  [accountTransactions]);

  const netAccountImpact = accountInflow - accountOutflow;

  const calculatedBalance = account.startingBalance || 0;

  const utilization = account.creditLimit ? (calculatedBalance / account.creditLimit) * 100 : 0;
  const isHighUtilization = utilization > 30;

  const handleBalanceSubmit = () => {
    onUpdate({
      ...account,
      startingBalance: parseFloat(tempBalance) || 0,
      principalBalance: 0 // Keep as 0, we use startingBalance + activity now
    });
    setIsEditingBalance(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="bg-white border border-[#E2E8F0] p-6 rounded-[32px] shadow-lg shadow-black/5 hover:border-[#2D34FB]/20 transition-all"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#F9F7F2] rounded-xl text-[#2D34FB]">
            {account.type === 'credit_card' ? <CreditCard className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-lexend font-bold text-[#2D3748] leading-tight">{account.name}</h4>
            <p className="text-[10px] text-[#718096] uppercase font-bold tracking-widest">{account.institution}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(account);
            }}
            className="p-2 text-[#718096] hover:text-[#2D34FB] hover:bg-[#2D34FB]/5 rounded-lg transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className={cn(
            "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider",
            account.type === 'credit_card' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
          )}>
            {account.type.replace('_', ' ')}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-xs text-[#718096] font-medium block">Current Mesh Balance</span>
            <span className="text-2xl font-lexend font-bold text-[#2D3748]">
              ${calculatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-widest mt-1">Static Node Value</p>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-[#718096] uppercase font-bold tracking-widest block mb-1">Starting Node Value</span>
            {isEditingBalance ? (
              <div className="flex items-center gap-1">
                <input 
                  autoFocus
                  type="number"
                  value={tempBalance}
                  onChange={(e) => setTempBalance(e.target.value)}
                  onBlur={handleBalanceSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleBalanceSubmit()}
                  className="w-20 px-2 py-1 bg-[#F9F7F2] border border-[#2D34FB]/20 rounded-lg text-xs font-bold text-[#2D34FB] focus:outline-none"
                />
              </div>
            ) : (
              <button 
                onClick={() => setIsEditingBalance(true)}
                className="text-xs font-bold text-[#2D34FB] hover:underline"
              >
                ${(account.startingBalance || 0).toLocaleString()}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#F1F5F9]">
          <div className="space-y-0.5">
            <span className="text-[8px] text-[#718096] uppercase font-bold tracking-widest block">Inflow</span>
            <span className="text-xs font-lexend font-bold text-green-600">${accountInflow.toLocaleString()}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[8px] text-[#718096] uppercase font-bold tracking-widest block">Outflow</span>
            <span className="text-xs font-lexend font-bold text-red-600">${accountOutflow.toLocaleString()}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[8px] text-[#718096] uppercase font-bold tracking-widest block">Net Impact</span>
            <span className={`text-xs font-lexend font-bold ${netAccountImpact >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {netAccountImpact >= 0 ? '+' : ''}${netAccountImpact.toLocaleString()}
            </span>
          </div>
        </div>

        {account.type === 'credit_card' && account.creditLimit && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-[#718096] uppercase tracking-widest">
                <span className="flex items-center gap-1">
                  Utilization
                  {isHighUtilization && <AlertTriangle className="w-3 h-3 text-red-500" />}
                </span>
                <span className={isHighUtilization ? "text-red-500" : ""}>{Math.round(utilization)}%</span>
              </div>
              <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(utilization, 100)}%` }}
                  className={cn(
                    "h-full transition-colors",
                    isHighUtilization ? "bg-red-500" : "bg-[#2D34FB]"
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-[9px] text-[#718096] uppercase font-bold tracking-widest">Min. Payment</p>
                <p className="text-sm font-lexend font-bold text-[#2D3748]">${account.minimumPayment?.toLocaleString() || '0'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-[#718096] uppercase font-bold tracking-widest">Last Statement</p>
                <p className="text-sm font-lexend font-bold text-[#2D3748]">${account.lastStatementBalance?.toLocaleString() || '0'}</p>
              </div>
            </div>

            {account.dueDate && (
              <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
                <div className="flex items-center gap-2 text-[10px] text-[#718096] font-bold uppercase tracking-widest">
                  <Calendar className="w-3 h-3" />
                  Due {new Date(account.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                {account.statementClosingDay && (
                  <div className="flex items-center gap-1 text-[10px] text-[#718096] font-bold uppercase tracking-widest">
                    <Info className="w-3 h-3" />
                    Closes Day {account.statementClosingDay}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {account.type !== 'credit_card' && (
          <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
             <span className="text-[10px] text-[#718096] font-bold uppercase tracking-widest">Active Reserve</span>
             <div className="flex items-center gap-1 text-[#8DAA91]">
               <ShieldCheck className="w-3 h-3" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Protected</span>
             </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
