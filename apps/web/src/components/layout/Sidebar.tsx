'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  Home,
  ArrowLeftRight,
  CreditCard,
  CalendarDays,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  ChevronRight,
  Database
} from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleAiDrawer } = useFinanceStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close avatar popup on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { name: 'Home', href: '/', icon: Home, match: (p: string) => p === '/' },
    { name: 'Activity', href: '/activity', icon: ArrowLeftRight, match: (p: string) => p === '/activity' || p.startsWith('/transactions') },
    { name: 'Wallet', href: '/wallet', icon: CreditCard, match: (p: string) => p === '/wallet' || p.startsWith('/accounts') },
    { name: 'Plan', href: '/plan', icon: CalendarDays, match: (p: string) => p === '/plan' || p.startsWith('/bills') },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, match: (p: string) => p.startsWith('/analytics') },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <aside className="w-[76px] h-screen sticky top-0 bg-[var(--vault)] text-[var(--vault-muted)] flex flex-col items-center py-5 z-40 border-r border-[var(--line)] select-none">
      {/* Vault Logo Badge */}
      <Link
        href="/"
        className="w-[38px] h-[38px] rounded-[11px] bg-[var(--teal)] text-[var(--vault)] grid place-items-center mb-4 transition-transform hover:scale-105 shadow-md shadow-[var(--teal)]/20"
        title="FinanceOS Vault"
      >
        <Shield className="w-5 h-5 text-white" />
      </Link>

      {/* 5 Primary Navigation Items */}
      <nav className="flex flex-col items-center gap-1.5 w-full px-2">
        {navItems.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'w-14 py-2 rounded-xl flex flex-col items-center gap-1 text-[10.5px] font-medium transition-all group',
                isActive
                  ? 'bg-white/10 text-[var(--vault-ink)] font-semibold shadow-xs'
                  : 'text-[var(--vault-muted)] hover:bg-white/5 hover:text-[var(--vault-ink)]'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-[var(--teal)]' : 'text-[var(--vault-muted)] group-hover:text-[var(--vault-ink)]'
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Copilot Quick Trigger */}
        <button
          onClick={toggleAiDrawer}
          className="w-14 py-2 rounded-xl flex flex-col items-center gap-1 text-[10.5px] font-medium text-[var(--vault-muted)] hover:bg-white/5 hover:text-[var(--vault-ink)] transition-all group cursor-pointer"
          title="Open AI Copilot (⌘K)"
        >
          <Sparkles className="w-5 h-5 text-[var(--teal)] group-hover:scale-110 transition-transform" />
          <span>Copilot</span>
        </button>
      </nav>

      {/* Spacer to push user profile to bottom */}
      <div className="flex-1" />

      {/* Avatar & User Controls Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 grid place-items-center text-xs font-semibold text-[var(--vault-ink)] transition-all cursor-pointer"
          title="Account & Settings"
        >
          FO
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute left-12 bottom-0 w-56 rounded-2xl bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-left-2 duration-150">
            <div className="px-3 py-2 border-b border-[var(--line-soft)] mb-1">
              <div className="font-semibold text-xs text-[var(--ink)]">Vault Owner</div>
              <div className="text-[11px] text-[var(--muted-color)]">Protected Session</div>
            </div>

            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--ink)] hover:bg-[var(--raised)] transition-colors"
            >
              <Settings className="w-4 h-4 text-[var(--teal)]" />
              <span>Settings & Security</span>
            </Link>

            <Link
              href="/activity"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--ink)] hover:bg-[var(--raised)] transition-colors"
            >
              <Database className="w-4 h-4 text-[var(--muted-color)]" />
              <span>Review Queue</span>
            </Link>

            <div className="border-t border-[var(--line-soft)] my-1" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--neg)] hover:bg-[var(--neg-soft)] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Lock Vault / Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
