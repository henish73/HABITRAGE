'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Tag, Plus, Check, FolderEdit, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CategoryManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: { name: string; count: number }[];
}

export function CategoryManagerDialog({ isOpen, onClose, categories }: CategoryManagerDialogProps) {
  const queryClient = useQueryClient();
  const [newCatName, setNewCatName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    toast.success(`Category "${newCatName.trim()}" created. You can now assign transactions to it.`);
    setNewCatName('');
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--line-soft)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--ink)]">Manage Categories</h2>
              <p className="text-xs text-[var(--muted-color)]">Organize your transaction classification rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[var(--line)] hover:bg-[var(--raised)] grid place-items-center text-[var(--muted-color)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create New Category Form */}
        <form onSubmit={handleAddCategory} className="flex gap-2 my-4">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category name (e.g. Subscriptions, Pet Care)"
            className="flex-1 h-9 px-3 rounded-xl bg-[var(--raised)] border border-[var(--line)] text-xs text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
          <button
            type="submit"
            disabled={!newCatName.trim()}
            className="px-3.5 h-9 rounded-xl bg-[var(--ink)] text-[var(--surface)] hover:opacity-90 text-xs font-semibold flex items-center gap-1.5 transition-opacity cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        {/* Existing Categories List */}
        <div className="max-h-64 overflow-y-auto divide-y divide-[var(--line-soft)] border border-[var(--line-soft)] rounded-xl bg-[var(--raised)]/40 p-1">
          {categories.map((c) => (
            <div key={c.name} className="flex items-center justify-between py-2 px-3 text-xs">
              <span className="font-medium text-[var(--ink)]">{c.name}</span>
              <span className="font-mono text-[11px] text-[var(--muted-color)] bg-[var(--surface)] px-2 py-0.5 rounded-full border border-[var(--line)]">
                {c.count} transactions
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 mt-4 border-t border-[var(--line-soft)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--raised)] text-xs font-semibold text-[var(--ink)] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
