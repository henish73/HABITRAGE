'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, ShieldCheck, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UploadCreditReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadCreditReportDialog({ isOpen, onClose }: UploadCreditReportDialogProps) {
  const queryClient = useQueryClient();
  const [bureau, setBureau] = useState<'TransUnion' | 'Equifax'>('TransUnion');
  const [score, setScore] = useState('751');
  const [utilization, setUtilization] = useState('5.1');
  const [totalDebt, setTotalDebt] = useState('812.30');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    // If file name has hints, adjust
    const name = selected.name.toLowerCase();
    if (name.includes('equifax')) setBureau('Equifax');
    if (name.includes('transunion')) setBureau('TransUnion');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedScore = parseInt(score, 10);
    const parsedUtil = parseFloat(utilization);
    const parsedDebt = parseFloat(totalDebt);

    if (isNaN(parsedScore) || parsedScore < 300 || parsedScore > 900) {
      setError('Please enter a valid credit score between 300 and 900.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/credit-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bureau,
          score: parsedScore,
          utilization_percent: isNaN(parsedUtil) ? 0 : parsedUtil,
          total_debt: isNaN(parsedDebt) ? 0 : parsedDebt,
          file_name: file ? file.name : `${bureau}_Consumer_Disclosure_${new Date().getFullYear()}.pdf`,
          file_url: '',
          extracted_text: `${bureau} Credit Disclosure uploaded by user. Score: ${parsedScore}.`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save credit report');
      }

      toast.success(`${bureau} credit score (${parsedScore}) updated successfully.`);
      queryClient.invalidateQueries({ queryKey: ['credit-reports'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--line-soft)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--ink)]">Upload Credit Report</h2>
              <p className="text-xs text-[var(--muted-color)]">Equifax or TransUnion consumer disclosure</p>
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

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
          {/* Bureau Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setBureau('TransUnion')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                bureau === 'TransUnion'
                  ? 'bg-[var(--surface)] border-[var(--teal)] text-[var(--teal)] shadow-xs'
                  : 'bg-[var(--raised)] border-[var(--line)] text-[var(--muted-color)] hover:text-[var(--ink)]'
              }`}
            >
              <span>TransUnion</span>
            </button>
            <button
              type="button"
              onClick={() => setBureau('Equifax')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                bureau === 'Equifax'
                  ? 'bg-[var(--surface)] border-[var(--teal)] text-[var(--teal)] shadow-xs'
                  : 'bg-[var(--raised)] border-[var(--line)] text-[var(--muted-color)] hover:text-[var(--ink)]'
              }`}
            >
              <span>Equifax Canada</span>
            </button>
          </div>

          {/* PDF File Picker */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-1">
              Credit Report PDF (Optional)
            </label>
            <label className="border-2 border-dashed border-[var(--line)] hover:border-[var(--teal)] rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[var(--raised)]/50">
              <FileText className="w-6 h-6 text-[var(--muted-color)] mb-1" />
              <span className="text-xs font-semibold text-[var(--ink)]">
                {file ? file.name : 'Choose consumer disclosure PDF'}
              </span>
              <span className="text-[10.5px] text-[var(--faint)]">
                PDF or scanned report disclosure
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Credit Score & Utilization */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink)] mb-1">
                Credit Score (300-900)
              </label>
              <input
                type="number"
                min="300"
                max="900"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-[var(--raised)] border border-[var(--line)] text-xs text-[var(--ink)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink)] mb-1">
                Utilization (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={utilization}
                onChange={(e) => setUtilization(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-[var(--raised)] border border-[var(--line)] text-xs text-[var(--ink)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-1">
              Total Reported Revolving Debt ($CAD)
            </label>
            <input
              type="number"
              step="0.01"
              value={totalDebt}
              onChange={(e) => setTotalDebt(e.target.value)}
              className="w-full h-9 px-3 rounded-xl bg-[var(--raised)] border border-[var(--line)] text-xs text-[var(--ink)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--line-soft)]">
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
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[var(--ink)] text-[var(--surface)] hover:opacity-90 text-xs font-semibold flex items-center gap-1.5 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
