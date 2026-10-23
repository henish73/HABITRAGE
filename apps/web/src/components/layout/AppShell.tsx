'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { FloatingAiWidget } from '@/components/ai/FloatingAiWidget';
import { PlaidSimulationModal } from '@/components/accounts/PlaidSimulationModal';
import { CreateTransactionModal } from '@/components/transactions/CreateTransactionModal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Login and the printable report are standalone pages without the app chrome.
  const isStandalone = pathname === '/login' || pathname === '/report';

  if (isStandalone) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-[var(--canvas)]">
        {children}
      </main>
    );
  }

  return (
    <>
      <div className="flex w-full min-h-screen">
        {/* Sidebar — hidden on mobile, visible on lg+ */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />

      {/* Global Floating AI Copilot */}
      <FloatingAiWidget />

      {/* Modals */}
      <PlaidSimulationModal />
      <CreateTransactionModal />
    </>
  );
}
