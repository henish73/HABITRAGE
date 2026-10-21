'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useFinanceStore } from '@/lib/store';
import { formatCAD, cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface CardItem {
  id: string;
  name: string;
  gradientClass: string;
  balance: number;
  limit: number;
  utilization: number;
  warn?: boolean;
}

export function CardWalletWidget() {
  const { isMasked } = useFinanceStore();

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
  });

  const rawCards = (accountsData?.accounts || []).filter((a: any) => a.type === 'credit_card');

  const cards: CardItem[] = rawCards.length > 0 ? rawCards.slice(0, 4).map((c: any) => {
    const isAmexEssential = c.account_name.toLowerCase().includes('essential');
    const isTD = c.bank_name.toLowerCase().includes('td');
    const isAmexGreen = c.account_name.toLowerCase().includes('green');
    const isRog = c.bank_name.toLowerCase().includes('rogers');

    const gradientClass = isAmexEssential ? 'amexE' : isTD ? 'td' : isAmexGreen ? 'amexG' : isRog ? 'rog' : 'cibc';
    const limit = c.credit_limit || 1000;
    const balance = c.balance || 0;
    const utilization = limit > 0 ? Math.round((Math.max(0, balance) / limit) * 100) : 0;

    return {
      id: c.id,
      name: c.account_name.replace('American Express', 'Amex').replace('Credit Card', ''),
      gradientClass,
      balance,
      limit,
      utilization,
      warn: utilization >= 70,
    };
  }) : [
    {
      id: '1',
      name: 'Amex Essential',
      gradientClass: 'amexE',
      balance: 10145.23,
      limit: 13500,
      utilization: 75,
      warn: true,
    },
    {
      id: '2',
      name: 'TD Low Rate Visa',
      gradientClass: 'td',
      balance: 709.86,
      limit: 1000,
      utilization: 71,
      warn: true,
    },
    {
      id: '3',
      name: 'Amex Green',
      gradientClass: 'amexG',
      balance: 4595.92,
      limit: 8500,
      utilization: 54,
    },
    {
      id: '4',
      name: 'Rogers Mastercard',
      gradientClass: 'rog',
      balance: 75.71,
      limit: 500,
      utilization: 15,
    },
  ];

  const totalLimit = cards.reduce((sum, c) => sum + c.limit, 0);

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-vault min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)]">
          Card wallet
        </span>
        <span className="text-xs font-mono text-[var(--muted-color)]">
          {cards.length} cards · {formatCAD(totalLimit)} limit
        </span>
      </div>

      {/* Realistic 2x2 Card Grid */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div
            key={card.id || card.name}
            className={`ccard ${card.gradientClass} p-3 sm:p-3.5 flex flex-col justify-between rounded-xl relative overflow-hidden`}
          >
            {/* Card name */}
            <span className="text-xs font-semibold text-white/95 truncate block">
              {card.name}
            </span>

            {/* Balance & Utilization */}
            <div className="mt-2.5">
              <span className={cn(
                "font-mono font-bold text-sm sm:text-base text-white block",
                isMasked && "blurnum"
              )}>
                {formatCAD(card.balance)}
              </span>

              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-white/90">
                <div className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(card.utilization, 100)}%`,
                      backgroundColor: card.warn ? '#F6C564' : '#FFFFFF',
                    }}
                  />
                </div>
                <span className="font-mono font-semibold">{card.utilization}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Link */}
      <div className="mt-3 pt-2.5 border-t border-[var(--line-soft)] flex justify-end">
        <Link
          href="/wallet"
          className="text-xs font-semibold text-[var(--teal)] hover:opacity-80 inline-flex items-center gap-1 transition-opacity"
        >
          <span>View all {rawCards.length || 6} cards &amp; limits</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
