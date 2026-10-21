'use client';

import React, { useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Search,
  Eye,
  EyeOff,
  Plus,
  Sun,
  Moon,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => setMounted(true), []);
  const {
    isMasked,
    toggleMask,
    globalSearch,
    setGlobalSearch,
    openAddTransaction,
    openPlaidModal,
    toggleAiDrawer,
  } = useFinanceStore();
  const router = useRouter();

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      router.push(`/transactions?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/90 backdrop-blur-md px-2 sm:px-6 flex items-center justify-between gap-1.5 sm:gap-4 sticky top-0 z-30 w-full min-w-0">
      {/* Global Search */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0 max-w-[130px] xs:max-w-[180px] sm:max-w-md">
        <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
        <input
          id="global-search-input"
          type="text"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Search..."
          className="w-full h-8 sm:h-10 pl-8 sm:pl-9 pr-2 sm:pr-12 text-xs rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all placeholder:text-muted-foreground/70"
        />
        <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded text-muted-foreground font-mono">
          ⌘K
        </kbd>
      </form>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* CAD Currency Pill */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-foreground border border-border">
          <span className="w-2 h-2 rounded-full bg-positive" />
          <span>CAD ($)</span>
        </div>

        {/* Mask Numbers Toggle */}
        <button
          onClick={toggleMask}
          title={isMasked ? 'Reveal Balances & Numbers' : 'Mask Balances & Numbers'}
          className="flex items-center justify-center gap-1.5 text-xs font-medium w-8 h-8 sm:w-auto sm:h-9 sm:px-3 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all shrink-0"
        >
          {isMasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{isMasked ? 'Masked' : 'Revealed'}</span>
        </button>

        {/* Connect Bank (Plaid) - Hidden on mobile screens to save space */}
        <button
          onClick={openPlaidModal}
          className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 h-9 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-all shrink-0"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Connect Bank</span>
        </button>

        {/* Add Transaction Button */}
        <button
          onClick={openAddTransaction}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold w-8 h-8 sm:w-auto sm:h-9 sm:px-3.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Transaction</span>
        </button>

        {/* AI Copilot Drawer Trigger */}
        <button
          onClick={toggleAiDrawer}
          title="Open AI Copilot"
          className="w-8 h-8 sm:w-9 sm:h-9 p-1.5 sm:p-2 flex items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent hover:bg-accent/20 transition-all shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Dark / Light Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle Theme"
          className="w-8 h-8 sm:w-9 sm:h-9 p-1.5 sm:p-2 flex items-center justify-center rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all shrink-0"
        >
          {mounted ? (theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />) : <div className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
}
