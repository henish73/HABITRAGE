'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  Search,
  Eye,
  EyeOff,
  Plus,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState('Good evening');
  const [formattedDate, setFormattedDate] = useState('Wednesday, October 21 · Synced 2 min ago');

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('en-CA', options);
    setFormattedDate(`${dateStr} · Synced 2 min ago`);
  }, []);

  const {
    isMasked,
    toggleMask,
    globalSearch,
    setGlobalSearch,
    openAddTransaction,
    toggleAiDrawer,
  } = useFinanceStore();
  const router = useRouter();

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
          searchInput.focus();
        } else {
          toggleAiDrawer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAiDrawer]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      router.push(`/activity?search=${encodeURIComponent(globalSearch.trim())}`);
    } else {
      toggleAiDrawer();
    }
  };

  return (
    <header className="h-16 border-b border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur-md px-3 sm:px-8 flex items-center justify-between gap-3 sticky top-0 z-30 w-full min-w-0">
      {/* Hello Greeting */}
      <div className="flex flex-col min-w-0 shrink-0">
        <b className="text-base sm:text-lg font-bold tracking-tight text-[var(--ink)] leading-tight truncate">
          {greeting}
        </b>
        <span className="hidden sm:inline text-xs text-[var(--muted-color)] leading-tight">
          {formattedDate}
        </span>
      </div>

      {/* Center Command Bar (⌘K) */}
      <form
        onSubmit={handleSearchSubmit}
        className="relative flex-1 min-w-0 max-w-xs sm:max-w-md mx-2"
      >
        <div className="relative flex items-center w-full h-9 sm:h-10 rounded-[11px] bg-[var(--surface)] border border-[var(--line)] px-3 text-xs text-[var(--faint)] shadow-xs focus-within:ring-2 focus-within:ring-[var(--teal)] focus-within:border-[var(--teal)] transition-all">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--muted-color)] shrink-0 mr-2" />
          <input
            id="global-search-input"
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Ask, search or jump to…"
            className="w-full bg-transparent text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none text-xs"
          />
          <kbd className="hidden sm:inline-block text-[11px] font-mono border border-[var(--line)] rounded-md px-1.5 py-0.5 text-[var(--muted-color)] ml-1 shrink-0">
            ⌘K
          </kbd>
        </div>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Mask Numbers Toggle Button (ibtn) */}
        <button
          onClick={toggleMask}
          title={isMasked ? 'Reveal Balances' : 'Mask Balances'}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-[11px] border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] flex items-center justify-center text-[var(--muted-color)] hover:text-[var(--ink)] transition-all cursor-pointer"
        >
          {isMasked ? <EyeOff className="w-4 h-4 text-[var(--teal)]" /> : <Eye className="w-4 h-4" />}
        </button>

        {/* AI Copilot Drawer */}
        <button
          onClick={toggleAiDrawer}
          title="Open AI Copilot"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-[11px] border border-[var(--teal)]/30 bg-[var(--teal-soft)] text-[var(--teal)] hover:opacity-90 flex items-center justify-center transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Primary "+ New" Transaction Button (pbtn) */}
        <button
          onClick={openAddTransaction}
          className="h-8 sm:h-9 rounded-[11px] bg-[var(--ink)] text-[var(--surface)] hover:opacity-90 flex items-center gap-1.5 px-2.5 sm:px-3.5 text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">New</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle Theme"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-[11px] border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] flex items-center justify-center text-[var(--muted-color)] hover:text-[var(--ink)] transition-all cursor-pointer"
        >
          {mounted ? (theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />) : <div className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
