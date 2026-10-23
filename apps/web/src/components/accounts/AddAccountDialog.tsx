'use client';

import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Building2, CreditCard, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCAD } from '@financeos/shared';

interface AddAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingAccount?: any | null;
}

const field =
  'w-full h-9 px-3 rounded-xl bg-[var(--raised)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]';
const labelCls = 'block text-xs font-semibold text-[var(--ink)] mb-1';
const hint = 'text-[11px] text-[var(--muted-color)] mt-1';

export function AddAccountDialog({ isOpen, onClose, editingAccount }: AddAccountDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(editingAccount?.id);

  const [type, setType] = useState<'bank' | 'credit_card'>('credit_card');
  const [bankName, setBankName] = useState('CIBC');
  const [accountName, setAccountName] = useState('');
  const [last4, setLast4] = useState('');
  const [accountType, setAccountType] = useState('Chequing');
  const [balance, setBalance] = useState('0');
  const [creditLimit, setCreditLimit] = useState('');
  const [aprPercent, setAprPercent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from the account being edited, or blank, every time the dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    const a = editingAccount;
    setType(a?.type ?? 'credit_card');
    setBankName(a?.bank_name ?? 'CIBC');
    setAccountName(a?.account_name ?? '');
    setLast4(String(a?.account_number ?? '').replace(/\D/g, '').slice(-4));
    setAccountType(a?.type === 'bank' ? a?.account_type ?? 'Chequing' : 'Chequing');
    setBalance(a ? String(a.balance ?? 0) : '0');
    setCreditLimit(a?.credit_limit ? String(a.credit_limit) : '');
    setAprPercent(typeof a?.apr === 'number' ? String(+(a.apr * 100).toFixed(2)) : '');
    setDueDate(a?.due_date ? String(a.due_date).slice(0, 10) : '');
    setMinPayment(a?.minimum_payment ? String(a.minimum_payment) : '');
    setError(null);
    setLoading(false);
  }, [isOpen, editingAccount]);

  if (!isOpen) return null;

  const optionalNumber = (v: string) => (v.trim() === '' ? null : Number(v));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accountName.trim()) return setError('Enter a name for this account.');
    if (last4.length !== 4) return setError('Enter the last 4 digits of the account number.');

    const limit = optionalNumber(creditLimit);
    const apr = optionalNumber(aprPercent);
    const minimum = optionalNumber(minPayment);
    if (type === 'credit_card' && (limit === null || !(limit > 0))) return setError('Enter the credit limit.');
    if (apr !== null && !(apr >= 0 && apr <= 100)) return setError('APR must be between 0 and 100.');
    if (minimum !== null && !(minimum >= 0)) return setError('Minimum payment can’t be negative.');
    const startingBalance = Number(balance);
    if (!isEditing && !Number.isFinite(startingBalance)) return setError('Enter a valid balance.');

    const common = {
      bank_name: bankName.trim(),
      account_name: accountName.trim(),
      account_number: `****${last4}`,
      account_type: type === 'bank' ? accountType : 'Credit Card',
      credit_limit: type === 'credit_card' ? limit : null,
      apr: type === 'credit_card' && apr !== null ? apr / 100 : null,
      due_date: type === 'credit_card' && dueDate ? dueDate : null,
      minimum_payment: type === 'credit_card' ? minimum : null,
    };

    setLoading(true);
    try {
      // Editing updates the existing account (a create here would add a duplicate).
      const res = isEditing
        ? await fetch(`/api/accounts/${encodeURIComponent(editingAccount.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(common),
          })
        : await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, ...common, balance: startingBalance }),
          });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save the account.');

      toast.success(isEditing ? 'Account updated.' : 'Account added.');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['forecast'] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Could not save the account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Edit account' : 'Add account'}
    >
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--line-soft)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center">
              {type === 'bank' ? <Building2 className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--ink)]">{isEditing ? 'Edit account' : 'Add account'}</h2>
              <p className="text-xs text-[var(--muted-color)]">
                {type === 'bank' ? 'Chequing or savings account' : 'Credit card with limit, APR and due date'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg border border-[var(--line)] hover:bg-[var(--raised)] grid place-items-center text-[var(--muted-color)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-4 p-3 rounded-xl bg-[var(--neg-soft)] border border-[var(--neg)]/20 text-xs text-[var(--neg)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
          {!isEditing && (
            <div className="grid grid-cols-2 gap-2">
              {(['bank', 'credit_card'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    type === t
                      ? 'bg-[var(--surface)] border-[var(--teal)] text-[var(--teal)] shadow-xs'
                      : 'bg-[var(--raised)] border-[var(--line)] text-[var(--muted-color)] hover:text-[var(--ink)]'
                  }`}
                >
                  {t === 'bank' ? <Building2 className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                  <span>{t === 'bank' ? 'Bank account' : 'Credit card'}</span>
                </button>
              ))}
            </div>
          )}

          <div>
            <label htmlFor="acct-bank" className={labelCls}>Financial institution</label>
            <select id="acct-bank" value={bankName} onChange={(e) => setBankName(e.target.value)} className={field}>
              {['CIBC', 'TD', 'RBC', 'American Express', 'Rogers Bank', 'Scotiabank', 'BMO', 'Tangerine', 'Other'].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="acct-name" className={labelCls}>Account name</label>
            <input
              id="acct-name"
              type="text"
              value={accountName}
              maxLength={120}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. CIBC Smart Account, TD Low Rate Visa"
              className={field}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="acct-last4" className={labelCls}>Last 4 digits</label>
              <input
                id="acct-last4"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))}
                placeholder="7339"
                className={`${field} font-mono`}
              />
            </div>
            {type === 'bank' ? (
              <div>
                <label htmlFor="acct-kind" className={labelCls}>Account type</label>
                <select id="acct-kind" value={accountType} onChange={(e) => setAccountType(e.target.value)} className={field}>
                  <option>Chequing</option>
                  <option>Savings</option>
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="acct-limit" className={labelCls}>Credit limit ($)</label>
                <input
                  id="acct-limit"
                  type="number"
                  min="0"
                  step="50"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="5000"
                  className={`${field} font-mono`}
                />
              </div>
            )}
          </div>

          {isEditing ? (
            <p className={hint}>
              Balance: <b className="font-mono text-[var(--ink)]">{formatCAD(editingAccount.balance)}</b>. It’s calculated from your
              transactions, so add or edit a transaction to change it.
            </p>
          ) : (
            <div>
              <label htmlFor="acct-balance" className={labelCls}>
                {type === 'credit_card' ? 'Amount owed today ($)' : 'Current balance ($)'}
              </label>
              <input
                id="acct-balance"
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className={`${field} font-mono`}
              />
              <p className={hint}>Transactions you add later build on this amount.</p>
            </div>
          )}

          {type === 'credit_card' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="acct-apr" className={labelCls}>Interest rate (APR %)</label>
                <input
                  id="acct-apr"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={aprPercent}
                  onChange={(e) => setAprPercent(e.target.value)}
                  placeholder="Leave blank to estimate"
                  className={`${field} font-mono`}
                />
              </div>
              <div>
                <label htmlFor="acct-min" className={labelCls}>Minimum payment ($)</label>
                <input
                  id="acct-min"
                  type="number"
                  min="0"
                  step="0.01"
                  value={minPayment}
                  onChange={(e) => setMinPayment(e.target.value)}
                  placeholder="Optional"
                  className={`${field} font-mono`}
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="acct-due" className={labelCls}>Next payment due</label>
                <input id="acct-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} />
                <p className={hint}>Used for due dates in Wallet and for the payoff planner.</p>
              </div>
            </div>
          )}

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
              className="px-4 py-2 rounded-xl bg-[var(--ink)] text-[var(--surface)] hover:opacity-90 text-xs font-semibold flex items-center gap-1.5 transition-opacity cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Save changes' : 'Add account'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
