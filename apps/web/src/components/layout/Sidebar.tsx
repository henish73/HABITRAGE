'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Clock,
  CalendarCheck,
  ShieldCheck,
  BarChart3,
  Sparkles,
  Settings,
  ChevronRight,
  Landmark,
} from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

export function Sidebar() {
  const pathname = usePathname();
  const { toggleAiDrawer } = useFinanceStore();

  // Query pending count
  const { data: txData } = useQuery({
    queryKey: ['transactions', 'pending-count'],
    queryFn: async () => {
      const res = await fetch('/api/transactions?status=pending&limit=1');
      return res.json();
    },
  });

  const pendingCount = txData?.total || 0;

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Accounts & Cards', href: '/accounts', icon: Wallet },
    { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
    {
      label: 'Pending Ledger',
      href: '/pending',
      icon: Clock,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    { label: 'Bills & Reminders', href: '/bills', icon: CalendarCheck },
    { label: 'Credit Reports', href: '/credit-reports', icon: ShieldCheck },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'AI Financial Copilot', href: '/assistant', icon: Sparkles, highlight: true },
    { label: 'Settings & Supabase', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header - Executive Precision Monochromatic Precision */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
          <Landmark className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-foreground text-sm">
            FinanceOS
            <span className="text-[9px] font-bold uppercase tracking-wider bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full border border-border">
              CAD
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
            <span>Executive Precision</span>
            <span>•</span>
            <span className="text-positive font-semibold">Free Forever</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-2">
          Platform Navigation
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={cn(
                    'w-4 h-4',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <span>{item.label}</span>
              </div>
              {item.badge ? (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.2 rounded-full border',
                    isActive
                      ? 'bg-primary-foreground text-primary border-transparent'
                      : 'bg-warning/10 text-warning border-warning/25'
                  )}
                >
                  {item.badge}
                </span>
              ) : (
                isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* AI Assistant Quick Launcher */}
      <div className="p-3 border-t border-border">
        <button
          type="button"
          onClick={toggleAiDrawer}
          className="w-full text-left p-3 rounded-xl bg-secondary/60 hover:bg-secondary border border-border transition-all duration-150 group"
        >
          <div className="flex items-center gap-1.5 text-foreground font-bold text-xs mb-0.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>AI Copilot</span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            Query 4,158 transactions in natural language
          </p>
        </button>
      </div>
    </aside>
  );
}
