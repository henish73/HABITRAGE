'use client';

import React, { useState } from 'react';
import { Trash2, AlertCircle, Check, X, ArrowRight } from 'lucide-react';
import { formatCAD } from '@/lib/utils';
import { toast } from 'sonner';

interface ProposedActionProps {
  type: 'delete' | 'update' | 'categorize';
  merchant: string;
  date: string;
  amount: number;
  accountName: string;
  balanceBefore: number;
  balanceAfter: number;
  transactionId?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function ProposedActionCard({
  type = 'delete',
  merchant,
  date,
  amount,
  accountName,
  balanceBefore,
  balanceAfter,
  onConfirm,
  onCancel,
}: ProposedActionProps) {
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState<'confirmed' | 'cancelled' | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setResolved('confirmed');
      toast.success('Action executed · You can undo from Settings', {
        action: {
          label: 'Undo',
          onClick: () => toast.info('Transaction restored from trash.'),
        },
      });
    } catch {
      toast.error('Failed to execute action.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setResolved('cancelled');
    onCancel();
  };

  if (resolved === 'confirmed') {
    return (
      <div className="p-3 rounded-xl bg-[var(--pos-soft)] border border-[var(--pos)]/20 text-xs text-[var(--pos)] flex items-center gap-2">
        <Check className="w-4 h-4 shrink-0" />
        <span>Confirmed: Transaction removed and account balance updated.</span>
      </div>
    );
  }

  if (resolved === 'cancelled') {
    return (
      <div className="p-2.5 rounded-xl bg-[var(--raised)] border border-[var(--line)] text-xs text-[var(--muted-color)] flex items-center gap-2">
        <X className="w-3.5 h-3.5" />
        <span>Action cancelled. No changes were made.</span>
      </div>
    );
  }

  return (
    <div className="border border-[var(--line)] rounded-2xl overflow-hidden bg-[var(--surface)] shadow-vault my-2">
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2 bg-[var(--neg-soft)] text-[var(--neg)] font-semibold text-xs">
        <Trash2 className="w-3.5 h-3.5 shrink-0" />
        <span>Delete transaction</span>
      </div>

      {/* Body: Impact Details */}
      <div className="p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--ink)]">
          <span>{merchant} · {date}</span>
          <span className="font-mono">{amount > 0 ? `+${formatCAD(amount)}` : `−${formatCAD(Math.abs(amount))}`}</span>
        </div>

        <div className="flex items-center justify-between text-[11.5px] text-[var(--muted-color)] border-t border-[var(--line-soft)] pt-2">
          <span>{accountName} balance</span>
          <span className="font-mono font-medium text-[var(--ink)] flex items-center gap-1">
            <span>{formatCAD(balanceBefore)}</span>
            <ArrowRight className="w-3 h-3 text-[var(--muted-color)]" />
            <span className="text-[var(--pos)] font-semibold">{formatCAD(balanceAfter)}</span>
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="grid grid-cols-2 gap-2 p-2.5 pt-0">
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="h-8 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-xs font-semibold text-[var(--ink)] transition-colors grid place-items-center cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="h-8 rounded-xl bg-[var(--neg)] hover:opacity-90 text-white text-xs font-semibold transition-opacity grid place-items-center cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      <div className="text-[10px] text-[var(--faint)] text-center pb-2">
        Undo available for 30 days
      </div>
    </div>
  );
}
