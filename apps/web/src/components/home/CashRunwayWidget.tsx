'use client';

import React from 'react';
import { useFinanceStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function CashRunwayWidget() {
  const { isMasked } = useFinanceStore();

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 flex flex-col gap-3 shadow-vault min-w-0 runway">
      {/* Header and Upcoming Milestone Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)] block">
            Cash runway · next 30 days
          </span>
          <div className="text-xs text-[var(--muted-color)] mt-0.5">
            Lowest point{' '}
            <b className={cn("font-mono text-[var(--ink)] font-semibold", isMasked && "blurnum")}>
              $2,081
            </b>{' '}
            on Nov 12 · never below $0
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--pos-soft)] text-[var(--pos)] border border-[var(--pos)]/20">
            + Payday Oct 30
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--neg-soft)] text-[var(--neg)] border border-[var(--neg)]/20">
            − Amex min Nov 5
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--pos-soft)] text-[var(--pos)] border border-[var(--pos)]/20">
            + Payday Nov 13
          </span>
        </div>
      </div>

      {/* Interactive SVG Projection Graph */}
      <div className="relative w-full overflow-hidden pt-2">
        <svg
          viewBox="0 0 600 130"
          className="w-full h-28 sm:h-32 block"
          preserveAspectRatio="none"
          aria-label="30-day projected cash runway chart"
        >
          <defs>
            <linearGradient id="rw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--teal)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--teal)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <g stroke="var(--line-soft)" strokeWidth="1">
            <line x1="0" y1="30" x2="600" y2="30" strokeDasharray="3 3" />
            <line x1="0" y1="70" x2="600" y2="70" strokeDasharray="3 3" />
            <line x1="0" y1="110" x2="600" y2="110" strokeDasharray="3 3" />
          </g>

          {/* Filled Area */}
          <path
            d="M0,120 L0.0,58.3 L20.0,60.7 L40.0,63.1 L60.0,65.5 L80.0,67.9 L100.0,70.3 L120.0,72.7 L140.0,75.1 L160.0,77.5 L180.0,37.0 L200.0,39.4 L220.0,41.8 L240.0,44.2 L260.0,46.6 L280.0,49.0 L300.0,68.8 L320.0,71.2 L340.0,73.6 L360.0,76.0 L380.0,78.4 L400.0,82.0 L420.0,84.4 L440.0,86.8 L460.0,46.2 L480.0,48.6 L500.0,51.0 L520.0,53.4 L540.0,55.8 L560.0,58.2 L580.0,60.6 L600.0,63.0 L600,120 Z"
            fill="url(#rw)"
          />

          {/* Runway Line */}
          <path
            className="line-draw"
            d="M0.0,58.3 L20.0,60.7 L40.0,63.1 L60.0,65.5 L80.0,67.9 L100.0,70.3 L120.0,72.7 L140.0,75.1 L160.0,77.5 L180.0,37.0 L200.0,39.4 L220.0,41.8 L240.0,44.2 L260.0,46.6 L280.0,49.0 L300.0,68.8 L320.0,71.2 L340.0,73.6 L360.0,76.0 L380.0,78.4 L400.0,82.0 L420.0,84.4 L440.0,86.8 L460.0,46.2 L480.0,48.6 L500.0,51.0 L520.0,53.4 L540.0,55.8 L560.0,58.2 L580.0,60.6 L600.0,63.0"
            fill="none"
            stroke="var(--teal)"
            strokeWidth="2.2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Milestone Event Nodes */}
          <g fill="var(--surface)" strokeWidth="2.2" vectorEffect="non-scaling-stroke">
            <circle cx="180" cy="37" r="4.5" stroke="var(--pos)" />
            <circle cx="300" cy="68.8" r="4.5" stroke="var(--neg)" />
            <circle cx="440" cy="86.8" r="4.5" stroke="var(--warn)" />
            <circle cx="460" cy="46.2" r="4.5" stroke="var(--pos)" />
          </g>

          {/* Current Day Anchor */}
          <circle cx="0" cy="58.3" r="5" fill="var(--teal)" />
        </svg>

        {/* Date Axis */}
        <div className="flex justify-between font-mono text-[11px] text-[var(--faint)] pt-2 border-t border-[var(--line-soft)] select-none">
          <span>Today</span>
          <span>Oct 30</span>
          <span>Nov 5</span>
          <span>Nov 12</span>
          <span>Nov 20</span>
        </div>
      </div>
    </div>
  );
}
