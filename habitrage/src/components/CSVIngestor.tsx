import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, ArrowRight, CreditCard, Landmark, Calendar, RefreshCcw } from 'lucide-react';
import Papa from 'papaparse';
import { db } from '../lib/firebase';
import { writeBatch, doc, setDoc } from 'firebase/firestore';
import { Transaction, Account } from '../types';

interface CSVIngestorProps {
  userId: string;
  accounts: Account[];
  onSuccess: (count: number) => void;
  onError?: (msg: string) => void;
  mode: 'bank' | 'credit' | 'bulk_bank' | 'bulk_credit';
}

export const CSVIngestor: React.FC<CSVIngestorProps> = ({ userId, accounts, onSuccess, onError, mode }) => {
  const [file, setFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Specific mappings for the user's provided format
  const [mappings, setMappings] = useState({
    monthName: 'Month Name',
    accountPool: 'Account Pool',
    sourceFile: 'Source File',
    date: 'Transaction Date',
    description: 'Description',
    amount: 'Amount',
    type: 'Type',
    category: 'Category',
    status: 'Status'
  });

  // Helper to parse "2023 (8th month) august" -> "2023-08"
  const parseStatementMonth = (val: string) => {
    if (!val) return null;
    const match = val.match(/^(\d{4})\s*\((\d{1,2})(?:st|nd|rd|th)?\s*month\)/i);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      return `${year}-${month}`;
    }
    return null;
  };

  // Helper to parse dates like "Aug 31, 2023", "02-Oct-25", "09 Oct 2025"
  const parseTxDate = (val: string, fallbackMonth: number, fallbackYear: number) => {
    if (!val) {
      return new Date(fallbackYear, fallbackMonth - 1, 15).toISOString();
    }
    
    // Try standard parsing first
    let d = new Date(val);
    
    if (isNaN(d.getTime())) {
      return new Date(fallbackYear, fallbackMonth - 1, 15).toISOString();
    }
    
    // If year is short (e.g. 25), make sure it's 2025
    if (d.getFullYear() < 100) {
      d.setFullYear(2000 + d.getFullYear());
    }
    
    return d.toISOString();
  };

  // Extract unique accounts from the parsed data
  const detectedAccounts = useMemo(() => {
    if (!parsedData.length) return [];
    const accountsInfo = new Map<string, 'bank_checking' | 'credit_card'>();
    
    parsedData.forEach(row => {
      // Filter based on mode if it's bulk
      const pool = (row[mappings.accountPool] || row['Account Pool'])?.toLowerCase();
      if (mode === 'bulk_bank' && pool && !pool.includes('bank')) return;
      if (mode === 'bulk_credit' && pool && !pool.includes('credit')) return;
      if (mode === 'bank' && pool && !pool.includes('bank')) return;
      if (mode === 'credit' && pool && !pool.includes('credit')) return;

      let source = row[mappings.sourceFile] || row['Source File'];
      if (!source && (mode === 'bank' || mode === 'bulk_bank')) source = 'Default Bank Account';
      if (!source && (mode === 'credit' || mode === 'bulk_credit')) source = 'Default Credit Card';
      
      if (source) {
        const name = source.replace('.csv', '').trim();
        const type = (pool?.includes('credit') || mode === 'credit' || mode === 'bulk_credit') ? 'credit_card' : 'bank_checking';
        accountsInfo.set(name, type as any);
      }
    });

    return Array.from(accountsInfo.entries()).map(([name, type]) => ({ name, type }));
  }, [parsedData, mappings, mode]);

  // Extract unique categories from the parsed data
  const detectedCategories = useMemo(() => {
    if (!parsedData.length) return [];
    const cats = new Set<string>();
    parsedData.forEach(row => {
      const cat = row[mappings.category] || row['Category'];
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [parsedData, mappings]);

  // Improved mapping detection
  const detectMappings = useCallback((data: any[], headers: string[]) => {
    if (!data || !data.length) return mappings;
    const firstRow = data[0];
    const newMappings = { ...mappings };
    const lowerHeaders = headers.map(h => h.toLowerCase());

    // Strategy 1: Standard header matching
    headers.forEach(h => {
      const lowH = h.toLowerCase();
      if (lowH.includes('month')) newMappings.monthName = h;
      if (lowH.includes('pool')) newMappings.accountPool = h;
      if (lowH.includes('source')) newMappings.sourceFile = h;
      if (lowH.includes('date')) newMappings.date = h;
      if (lowH.includes('desc') || lowH.includes('merchant')) newMappings.description = h;
      if (lowH.includes('amount')) newMappings.amount = h;
      if (lowH.includes('type')) newMappings.type = h;
      if (lowH.includes('category')) newMappings.category = h;
      if (lowH.includes('status')) newMappings.status = h;
    });

    // Strategy 2: Heuristic detection if standard headers missing
    const hasCrucialHeaders = newMappings.date && newMappings.amount;
    if (!hasCrucialHeaders) {
      headers.forEach(h => {
        const val = firstRow[h]?.toString() || '';
        // Look for date-like string (e.g., 2026, or something with / or -)
        if (!newMappings.date && (/^\d{4}/.test(val) || val.includes('/') || val.includes('-'))) {
          newMappings.date = h;
        }
        // Look for number-like string
        const numericVal = val.replace(/[^0-9.-]/g, '');
        if (!newMappings.amount && numericVal && !isNaN(parseFloat(numericVal)) && val.length < 15) {
          newMappings.amount = h;
        }
        // Look for description-like string (long, non-numeric)
        if (!newMappings.description && val.length > 5 && isNaN(parseFloat(val)) && !val.includes('/')) {
          newMappings.description = h;
        }
      });
    }

    return newMappings;
  }, [mappings]);

  const processFile = (file: File) => {
    setFile(file);
    setIsParsing(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const detectedHeaders = results.meta.fields || [];
        setHeaders(detectedHeaders);
        setParsedData(results.data);
        setIsParsing(false);
        
        const newMappings = detectMappings(results.data, detectedHeaders);
        setMappings(newMappings);
      }
    });
  };

  const handleUpload = async () => {
    if (!parsedData.length) return;
    
    setIsUploading(true);
    let successfulSignals = 0;
    let skippedTransfers = 0;
    let malformedSignals = 0;

    try {
      // 1. Ensure all detected accounts exist and reset balances to zero for fresh injection
      const accountMap: Record<string, { id: string, type: string }> = {};
      
      for (const node of detectedAccounts) {
        let existing = accounts.find(a => a.name.toLowerCase() === node.name.toLowerCase());
        if (!existing) {
          const accountId = crypto.randomUUID();
          const newAccount: Account = {
            accountId,
            name: node.name,
            institution: node.name.split(' ')[0] || 'Unknown',
            type: node.type,
            principalBalance: 0,
            startingBalance: 0,
            sourceFileName: `${node.name}.csv`
          };
          await setDoc(doc(db, `users/${userId}/accounts/${accountId}`), newAccount);
          accountMap[node.name] = { id: accountId, type: node.type };
        } else {
          // Reset existing account balance as requested
          await setDoc(doc(db, `users/${userId}/accounts/${existing.accountId}`), {
            ...existing,
            startingBalance: 0,
            principalBalance: 0,
            currentBalance: 0
          });
          accountMap[node.name] = { id: existing.accountId, type: existing.type };
        }
      }

      // 2. Upload transactions in batches
      let batch = writeBatch(db);
      let batchSize = 0;
      let rowIndex = 0;

      for (const row of parsedData) {
        rowIndex++;
        // Filter based on mode if it's bulk
        const pool = (row[mappings.accountPool] || row['Account Pool'])?.toLowerCase();
        if (mode === 'bulk_bank' && pool && !pool.includes('bank')) continue;
        if (mode === 'bulk_credit' && pool && !pool.includes('credit')) continue;
        if (mode === 'bank' && pool && !pool.includes('bank')) continue;
        if (mode === 'credit' && pool && !pool.includes('credit')) continue;

        const rawAmountStr = row[mappings.amount]?.toString().replace(/[^0-9.-]+/g, "");
        let amount = parseFloat(rawAmountStr);
        if (isNaN(amount)) {
          malformedSignals++;
          continue;
        }

        let sourceFileName = (row[mappings.sourceFile] || row['Source File'])?.replace('.csv', '').trim();
        if (!sourceFileName) {
          sourceFileName = (mode === 'bank' || mode === 'bulk_bank') ? 'Default Bank Account' : 'Default Credit Card';
        }
        
        const accountInfo = accountMap[sourceFileName];
        const accountId = accountInfo?.id || accounts[0]?.accountId;
        if (!accountId) {
          malformedSignals++;
          continue;
        }

        const merchant = row[mappings.description] || row['Description'] || 'Unknown';
        const rawType = (row[mappings.type] || row['Type'])?.toLowerCase();
        const rowDate = row[mappings.date] || row['Transaction Date'];
        const timestamp = parseTxDate(rowDate, selectedMonth, selectedYear);
        const category = row[mappings.category] || row['Category'] || 'Uncategorized';

        // Deterministic ID with row index to prevent collision on identical transactions
        const txIdHash = `${accountId}-${timestamp}-${amount}-${merchant}-${rowIndex}`.replace(/[^a-zA-Z0-9]/g, '');
        const txId = txIdHash.slice(0, 32);

        // Signal Classification
        const isTransfer = /payment|thank you|e-transfer|transfer|internal/i.test(merchant) || /Transfer/i.test(category);
        const isExcluded = /Not to Consider/i.test(category);

        if (isTransfer) {
          skippedTransfers++;
          // We still ingest them but mark them as hidden from main metrics
        }
        
        let txType: 'expense' | 'income' | 'internal_transfer' = 'expense';
        let finalAmount = amount;
        
        if (finalAmount < 0) {
          finalAmount = Math.abs(finalAmount);
          txType = (rawType === 'credit' || rawType === 'payment') ? 'expense' : 'income';
        } else {
          txType = (rawType === 'credit' || rawType === 'income') ? 'income' : 'expense';
        }

        const tx: Transaction = {
          txId,
          accountId,
          amount: finalAmount,
          type: isTransfer ? 'internal_transfer' : txType,
          merchant,
          category,
          timestamp,
          statementMonth: parseStatementMonth(row[mappings.monthName] || row['Month Name']) || `${new Date(timestamp).getFullYear()}-${(new Date(timestamp).getMonth() + 1).toString().padStart(2, '0')}`,
          isImpulse: false,
          status: isExcluded ? 'Excluded' : (row[mappings.status] || row['Status'] || 'Posted')
        };

        const docRef = doc(db, `users/${userId}/transactions/${txId}`);
        batch.set(docRef, tx);
        successfulSignals++;
        batchSize++;

        if (batchSize >= 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchSize = 0;
        }
      }

      if (batchSize > 0) {
        await batch.commit();
      }

      onSuccess(successfulSignals);
      const reportMsg = `Mesh Synced: ${successfulSignals} nodes active. ${skippedTransfers} transfers internalized. ${malformedSignals} signals rejected.`;
      console.log(reportMsg);
    } catch (err) {
      console.error("Ingestion failed:", err);
      onError?.("Mesh ingestion failure. Check signal data integrity.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) processFile(droppedFile);
          }}
          className="relative group overflow-hidden border-2 border-dashed border-[#E2E8F0] rounded-[40px] p-12 text-center transition-all hover:border-[#2D34FB]/30 bg-white/50 backdrop-blur-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#2D34FB]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-center gap-4 mb-8">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-[#F9F7F2] border border-[#E2E8F0] px-4 py-3 rounded-xl font-lexend font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#2D34FB]/20"
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
                className="bg-[#F9F7F2] border border-[#E2E8F0] px-4 py-3 rounded-xl font-lexend font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#2D34FB]/20"
              >
                {[2023, 2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="w-20 h-20 bg-[#2D34FB] rounded-[28px] flex items-center justify-center mx-auto text-white shadow-2xl shadow-[#2D34FB]/20 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
              {mode === 'bank' ? <Landmark className="w-10 h-10" /> : mode === 'credit' ? <CreditCard className="w-10 h-10" /> : <RefreshCcw className="w-10 h-10" />}
            </div>
            <div className="space-y-2">
              <h4 className="font-lexend font-bold text-2xl text-[#2D3748]">
                Import {mode === 'bank' || mode === 'bulk_bank' ? 'Bank' : 'Credit Card'} Mesh
              </h4>
              <p className="text-sm text-[#718096] max-w-xs mx-auto">
                Drop your {mode.startsWith('bulk') ? 'consolidated financial' : (mode === 'bank' ? 'bank statement' : 'credit card statement')} CSV to sync nodes.
              </p>
            </div>
            <label className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl font-lexend font-bold text-sm cursor-pointer hover:bg-[#2D34FB] transition-all shadow-xl hover:shadow-[#2D34FB]/20 active:scale-95">
              Select CSV File
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={(e) => e.target.files && processFile(e.target.files[0])} 
              />
              <ArrowRight className="w-4 h-4" />
            </label>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-[40px] p-8 md:p-10 space-y-10 shadow-2xl shadow-black/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#2D34FB]/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-[#2D34FB]/5 rounded-2xl flex items-center justify-center text-[#2D34FB] border border-[#2D34FB]/10">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-lexend font-bold text-xl text-[#2D3748]">{file.name}</h4>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="text-[10px] bg-[#F1F5F9] px-3 py-1 rounded-full text-[#718096] uppercase font-bold tracking-widest border border-[#E2E8F0]">
                    {parsedData.length} Data Points
                  </span>
                  <span className="text-[10px] bg-[#8DAA91]/10 px-3 py-1 rounded-full text-[#8DAA91] uppercase font-bold tracking-widest border border-[#8DAA91]/20">
                    {detectedAccounts.length} Strategic Nodes
                  </span>
                  <span className="text-[10px] bg-[#2D34FB]/10 px-3 py-1 rounded-full text-[#2D34FB] uppercase font-bold tracking-widest border border-[#2D34FB]/20">
                    Temporal: {new Date(selectedYear, selectedMonth - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setFile(null)} 
              className="w-12 h-12 flex items-center justify-center text-[#718096] hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* Temporal selection handled via unified selectors at top */}

            <div className="lg:col-span-3 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="w-4 h-4 text-[#2D34FB]" />
                  <label className="font-lexend text-[10px] font-bold text-[#718096] uppercase tracking-[0.2em]">Mesh Provisioning</label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {detectedAccounts.map(node => {
                    const exists = accounts.find(a => a.name.toLowerCase() === node.name.toLowerCase());
                    return (
                      <motion.div 
                        key={node.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex flex-col gap-3 p-5 rounded-3xl border transition-all ${
                          exists ? 'bg-green-50/30 border-green-100 shadow-sm' : 'bg-[#2D34FB]/5 border-[#2D34FB]/10 shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                            {node.type === 'credit_card' ? <CreditCard className="w-4 h-4 text-[#2D34FB]" /> : <Landmark className="w-4 h-4 text-[#8DAA91]" />}
                          </div>
                          {exists ? (
                            <span className="text-[9px] font-bold text-[#8DAA91] bg-white px-2 py-0.5 rounded-full border border-green-100 uppercase">Synced</span>
                          ) : (
                            <span className="text-[9px] font-bold text-[#2D34FB] bg-white px-2 py-0.5 rounded-full border border-[#2D34FB]/10 uppercase">Provision</span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-[#2D3748] truncate">{node.name}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCcw className="w-4 h-4 text-[#8DAA91]" />
                  <label className="font-lexend text-[10px] font-bold text-[#718096] uppercase tracking-[0.2em]">Signal Categories</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detectedCategories.map(cat => (
                    <span key={cat} className="px-3 py-1.5 bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl text-[10px] font-bold text-[#718096] uppercase tracking-wider">
                      {cat}
                    </span>
                  ))}
                  {detectedCategories.length === 0 && (
                    <span className="text-xs text-[#718096] italic">No categories detected in signal stream.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={isUploading || !parsedData.length}
            className="group relative w-full overflow-hidden bg-[#2D34FB] text-white font-lexend font-bold py-6 rounded-[32px] shadow-2xl shadow-[#2D34FB]/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4"
          >
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Syncing Mesh Nodes...</span>
              </>
            ) : (
              <>
                <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                <span>Execute Mesh Ingestion</span>
                <ArrowRight className="w-5 h-5 translate-x-0 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
