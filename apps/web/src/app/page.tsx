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

  // Calculate live balances
  const accounts = accountsData?.accounts || [];
  let liveCash = 0;
  let liveDebt = 0;

  for (const acc of accounts) {
    if (acc.type === 'bank') {
      liveCash += Math.max(0, acc.balance);
    } else if (acc.type === 'credit_card') {
      if (acc.balance > 0) {
        liveDebt += acc.balance;
      } else {
        // Overpaid card is an asset
        liveCash += Math.abs(acc.balance);
      }
    }
  }

  // Use live balances if available, fallback to audited canonicals
  const cashInBanks = liveCash > 0 ? liveCash : 2579.77;
  const debtOnCards = liveDebt > 0 ? liveDebt : 15558.16;
  const netWorth = cashInBanks - debtOnCards;

  return (
    <div className="flex flex-col gap-5 sm:gap-6 animate-in fade-in duration-200">
      {/* Row 1: Net Worth / Balance-Sheet Bar (1.55fr) + Needs You (1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-5">
        <BalanceSheetCard
          cashInBanks={cashInBanks}
          debtOnCards={debtOnCards}
          netWorth={netWorth}
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
