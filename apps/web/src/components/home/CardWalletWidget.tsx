'use client';

import React from 'react';
import Link from 'next/link';
import { useFinanceStore } from '@/lib/store';
import { formatCAD, cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface CardItem {
  name: string;
  gradientClass: string;
  balance: number;
  limit: number;
  utilization: number;
  warn?: boolean;
}

export function CardWalletWidget() {
  const { isMasked } = useFinanceStore();

  const cards: CardItem[] = [
    {
      name: 'Amex Essential',
      gradientClass: 'amexE',
      balance: 10145.23,
      limit: 13500,
      utilization: 75,
      warn: true,
    },
    {
      name: 'TD Low Rate Visa',
      gradientClass: 'td',
      balance: 709.86,
      limit: 1000,
      utilization: 71,
      warn: true,
    },
    {
      name: 'Amex Green',
      gradientClass: 'amexG',
      balance: 4595.92,
      limit: 8500,
      utilization: 54,
    },
    {
      name: 'Rogers Mastercard',
      gradientClass: 'rog',
      balance: 75.71,
      limit: 500,
      utilization: 15,
    },
  ];

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-vault min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)]">
          Card wallet
        </span>
        <Link
          href="/wallet"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--teal)] hover:opacity-80 transition-opacity"
        >
          <span>6 cards · $28,100 limit</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2x2 Responsive Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card) => {
          const isOver30 = card.utilization >= 30;
          const barColor = card.utilization >= 70 ? '#F6C564' : card.utilization >= 30 ? '#F6C564' : '#FFFFFF';

          return (
            <div
              key={card.name}
              className={cn("ccard", card.gradientClass)}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-semibold tracking-tight text-white/95">
                  {card.name}
                </span>
                {isOver30 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Utilization above 30%" />
                )}
              </div>

              <div className={cn("text-[17px] font-mono font-semibold text-white tracking-tight my-1", isMasked && "blurnum")}>
                {formatCAD(card.balance)}
              </div>

              <div className="flex items-center gap-2 text-[10.5px] font-mono text-white/90">
                <i className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden block">
                  <b
                    style={{
                      width: `${Math.min(card.utilization, 100)}%`,
                      background: barColor,
                    }}
                    className="block h-full rounded-full transition-all duration-300"
                  />
                </i>
                <span>{card.utilization}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
