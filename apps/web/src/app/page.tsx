'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BalanceSheetCard } from '@/components/home/BalanceSheetCard';
import { NeedsYouWidget } from '@/components/home/NeedsYouWidget';
import { CashRunwayWidget } from '@/components/home/CashRunwayWidget';
import { CardWalletWidget } from '@/components/home/CardWalletWidget';
import { LatestActivityWidget } from '@/components/home/LatestActivityWidget';
import { TransactionDrawer } from '@/components/transactions/TransactionDrawer';
import { Transaction } from '@financeos/shared';

export default function HomePage() {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // 1. Fetch Accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
  });

  // Cash is what sits in bank accounts (overdrafts count against it).
  // Owed is card debt net of any card credit balances, so cash − owed = net worth.
  const accounts: any[] = accountsData?.accounts || [];
  const bankAccounts = accounts.filter((a) => a.type === 'bank');
  const cards = accounts.filter((a) => a.type === 'credit_card');
  const cashInBanks = bankAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const debtOnCards = cards.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const netWorth = cashInBanks - debtOnCards;

  return (
    <div className="flex flex-col gap-5 sm:gap-6 animate-in fade-in duration-200">
      {/* Row 1: Net Worth / Balance-Sheet Bar (1.55fr) + Needs You (1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-5">
        <BalanceSheetCard
          cashInBanks={cashInBanks}
          debtOnCards={debtOnCards}
          netWorth={netWorth}
          bankCount={bankAccounts.length}
          cardCount={cards.length}
          isLoading={!accountsData}
        />
        <NeedsYouWidget />
      </div>

      {/* Row 2: 30-Day Cash Runway */}
      <CashRunwayWidget />

      {/* Row 3: Card Wallet (1.1fr) + Latest Activity (1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 sm:gap-5">
        <CardWalletWidget />
        <LatestActivityWidget />
      </div>

      {/* Transaction Details Slide-over Drawer */}
      {selectedTx && (
        <TransactionDrawer
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  );
}
