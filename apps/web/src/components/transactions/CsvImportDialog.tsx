'use client';

import React, { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CsvImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CsvImportDialog({ isOpen, onClose }: CsvImportDialogProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
    enabled: isOpen,
  });

  const accounts: any[] = accountsData?.accounts || [];

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text || '');
    };
    reader.readAsText(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      setError('Please select a valid CSV file with transaction data.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          targetAccountId: targetAccountId || accounts[0]?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import CSV');
      }

      toast.success(`Import complete: ${data.count} transactions imported (${data.skippedDuplicates} duplicates skipped).`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['forecast'] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--line-soft)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--ink)]">Import Statement CSV</h2>
              <p className="text-xs text-[var(--muted-color)]">Upload bank or credit card transaction statements</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[var(--line)] hover:bg-[var(--raised)] grid place-items-center text-[var(--muted-color)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-[var(--neg-soft)] border border-[var(--neg)]/20 text-xs text-[var(--neg)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Target Account */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-1">
              Destination Account
            </label>
            <select
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--raised)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bank_name} {a.account_name} ({a.account_number})
                </option>
              ))}
            </select>
          </div>

          {/* File Upload Drop Area */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-1">
              Statement File (.csv)
            </label>
            <label className="border-2 border-dashed border-[var(--line)] hover:border-[var(--teal)] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[var(--raised)]/50">
              <FileText className="w-8 h-8 text-[var(--muted-color)] mb-2" />
              <span className="text-xs font-semibold text-[var(--ink)]">
                {file ? file.name : 'Click to select CSV file'}
              </span>
              <span className="text-[11px] text-[var(--faint)] mt-0.5">
                Supports CIBC, TD, RBC, Rogers, AMEX statements
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line-soft)]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-[var(--line)] hover:bg-[var(--raised)] text-xs font-semibold text-[var(--ink)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !csvContent}
              className="px-4 py-2 rounded-xl bg-[var(--ink)] text-[var(--surface)] hover:opacity-90 text-xs font-semibold flex items-center gap-1.5 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing…</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Import Transactions</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
