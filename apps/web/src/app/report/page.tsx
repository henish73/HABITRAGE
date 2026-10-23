'use client';

import React, { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft } from 'lucide-react';
import { formatCAD } from '@financeos/shared';
import { filtersFromSearchParams } from '@/lib/tx-filters';
import { formatDay } from '@/lib/dates';

const MAX_ROWS = 5000;

const signed = (n: number) => (n > 0 ? `+${formatCAD(n)}` : n < 0 ? `−${formatCAD(Math.abs(n))}` : formatCAD(0));

function describeFilters(f: ReturnType<typeof filtersFromSearchParams>, tab: string | null): string[] {
  const parts: string[] = [];
  if (f.date_from || f.date_to) parts.push(`${f.date_from ? formatDay(f.date_from) : 'Start'} to ${f.date_to ? formatDay(f.date_to) : 'today'}`);
  if (f.search) parts.push(`Search “${f.search}”`);
  if (f.categories?.length) parts.push(`Category: ${f.categories.join(', ')}`);
  if (f.type) parts.push(`Type: ${f.type}`);
  if (f.status) parts.push(`Status: ${f.status}`);
  if (f.needs_review || tab === 'review') parts.push('To review only');
  if (f.amount_min !== undefined || f.amount_max !== undefined) {
    parts.push(`Amount ${f.amount_min !== undefined ? `≥ ${formatCAD(f.amount_min)}` : ''}${f.amount_min !== undefined && f.amount_max !== undefined ? ' and ' : ''}${f.amount_max !== undefined ? `≤ ${formatCAD(f.amount_max)}` : ''}`);
  }
  return parts;
}

function ReportContent() {
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const queryString = useMemo(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('limit', String(MAX_ROWS));
    sp.set('page', '1');
    return sp.toString();
  }, [searchParams]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', queryString],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?${queryString}`);
      if (!res.ok) throw new Error('Could not load the report.');
      return res.json();
    },
  });

  // Account names for the Account column.
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await fetch('/api/accounts')).json(),
  });
  const accountName = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accountsData?.accounts ?? []) map.set(a.id, a.account_name);
    return map;
  }, [accountsData]);

  const rows: any[] = data?.transactions ?? [];
  const total: number = data?.total ?? 0;
  const filterLines = describeFilters(filters, null);
  const generated = new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' });

  return (
    <div className="min-h-screen w-full py-6 px-4 print:p-0">
      <div className="no-print max-w-4xl mx-auto mb-4 flex items-center justify-between gap-3">
        <button
          onClick={() => (window.history.length > 1 ? window.history.back() : window.close())}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-color)] hover:text-[var(--ink)] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Activity
        </button>
        <button
          onClick={() => window.print()}
          disabled={isLoading || rows.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--teal)] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" /> Print or save as PDF
        </button>
      </div>

      <article className="report-sheet max-w-4xl mx-auto bg-white text-[#0E1726] rounded-xl shadow-lg print:shadow-none print:rounded-none p-8 print:p-0">
        <header className="flex items-start justify-between gap-6 border-b border-[#DFE5EE] pb-4 mb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight">FinanceOS transaction report</h1>
            <p className="text-xs text-[#5A6B80] mt-1">Generated {generated}</p>
          </div>
          <div className="text-right text-xs text-[#5A6B80] max-w-[55%]">
            {filterLines.length === 0 ? <div>All transactions</div> : filterLines.map((l) => <div key={l}>{l}</div>)}
          </div>
        </header>

        {error ? (
          <p className="text-sm text-[#C23A2E]">{(error as Error).message}</p>
        ) : isLoading ? (
          <p className="text-sm text-[#5A6B80]">Loading transactions…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[#5A6B80]">No transactions match these filters.</p>
        ) : (
          <>
            <section className="grid grid-cols-4 gap-3 mb-5 text-xs">
              {[
                { label: 'Transactions', value: total.toLocaleString(), color: '#0E1726' },
                { label: 'Money in (+)', value: `+${formatCAD(data.totalInflow ?? 0)}`, color: '#16835A' },
                { label: 'Money out (−)', value: `−${formatCAD(data.totalOutflow ?? 0)}`, color: '#C23A2E' },
                { label: 'Net', value: signed(data.netCashFlow ?? 0), color: (data.netCashFlow ?? 0) >= 0 ? '#16835A' : '#C23A2E' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-[#DFE5EE] p-3">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-[#5A6B80]">{s.label}</div>
                  <div className="font-mono font-bold text-base mt-0.5" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </section>

            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#0E1726] text-[10px] uppercase tracking-wider text-[#5A6B80]">
                  <th className="py-1.5 pr-2">Date</th>
                  <th className="py-1.5 pr-2">Description</th>
                  <th className="py-1.5 pr-2">Category</th>
                  <th className="py-1.5 pr-2">Account</th>
                  <th className="py-1.5 pr-2">Status</th>
                  <th className="py-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-[#EAEFF5] align-top">
                    <td className="py-1.5 pr-2 font-mono whitespace-nowrap">{t.date}</td>
                    <td className="py-1.5 pr-2 font-medium">{t.merchant || t.description}</td>
                    <td className="py-1.5 pr-2 text-[#5A6B80]">{t.category || 'General'}</td>
                    <td className="py-1.5 pr-2 text-[#5A6B80]">{accountName.get(t.account_id) ?? t.account?.account_name ?? ''}</td>
                    <td className="py-1.5 pr-2 capitalize">{t.status}</td>
                    <td className="py-1.5 text-right font-mono font-semibold whitespace-nowrap" style={{ color: t.amount > 0 ? '#16835A' : '#0E1726' }}>
                      {signed(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {total > rows.length && (
              <p className="text-xs text-[#5A6B80] mt-4">
                Showing the first {rows.length.toLocaleString()} of {total.toLocaleString()} transactions. Totals above cover all {total.toLocaleString()}. Narrow the dates or use Export CSV for the full list.
              </p>
            )}
          </>
        )}
      </article>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[var(--muted-color)]">Loading report…</div>}>
      <ReportContent />
    </Suspense>
  );
}
