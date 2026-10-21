'use client';

import React, { useState } from 'react';
import { useFinanceStore } from '@/lib/store';
import { useQueryClient } from '@tanstack/react-query';
import { X, Calendar, DollarSign, Tag, Check } from 'lucide-react';

export function AddBillDialog() {
  const { isAddBillOpen, closeAddBill } = useFinanceStore();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'rent' | 'credit_card' | 'utility' | 'subscription' | 'other'>('subscription');
  const [dueDay, setDueDay] = useState('15');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'biweekly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAddBillOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedAmount = parseFloat(amount);
    const parsedDueDay = parseInt(dueDay, 10);

    if (!name.trim()) {
      setError('Please enter a bill name.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (isNaN(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
      setError('Due day must be between 1 and 31.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          amount: parsedAmount,
          due_day: parsedDueDay,
          frequency,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create bill');
      }

      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setName('');
      setAmount('');
      closeAddBill();
    } catch (err: any) {
      setError(err.message || 'Error creating bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 shadow-2xl">
        <button
          onClick={closeAddBill}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-color)] hover:text-[var(--ink)] hover:bg-[var(--raised)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-[var(--ink)] mb-1">Add New Bill</h3>
        <p className="text-xs text-[var(--muted-color)] mb-5">
          Schedule a recurring payment to include in your 30-day runway projection.
        </p>

        {error && (
          <div className="mb-4 p-3 text-xs rounded-lg bg-[var(--neg-soft)] text-[var(--neg)] font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--muted-color)] uppercase tracking-wider mb-1">
              Bill / Payee Name
            </label>
            <input
              type="text"
              placeholder="e.g. Disney+, Rogers Wireless, Rent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl bg-[var(--canvas)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--muted-color)] uppercase tracking-wider mb-1">
                Amount (CAD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[var(--muted-color)] text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-10 pl-7 pr-3 text-sm rounded-xl bg-[var(--canvas)] border border-[var(--line)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--teal)]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--muted-color)] uppercase tracking-wider mb-1">
                Day of Month Due
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl bg-[var(--canvas)] border border-[var(--line)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--teal)]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--muted-color)] uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl bg-[var(--canvas)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
              >
                <option value="subscription">Subscription</option>
                <option value="utility">Utility</option>
                <option value="rent">Rent & Housing</option>
                <option value="credit_card">Credit Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--muted-color)] uppercase tracking-wider mb-1">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e: any) => setFrequency(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl bg-[var(--canvas)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
              >
                <option value="monthly">Monthly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 mt-2">
            <button
              type="button"
              onClick={closeAddBill}
              className="px-4 h-10 text-xs font-semibold rounded-xl border border-[var(--line)] text-[var(--muted-color)] hover:bg-[var(--raised)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 h-10 text-xs font-semibold rounded-xl bg-[var(--teal)] text-white hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Adding...' : 'Save Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
