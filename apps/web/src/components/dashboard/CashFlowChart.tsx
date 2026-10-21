'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCAD } from '@financeos/shared';

interface CashFlowChartProps {
  data: { month: string; income: number; expense: number }[];
  isLoading?: boolean;
}

export function CashFlowChart({ data, isLoading }: CashFlowChartProps) {
  if (isLoading) {
    return <div className="h-72 rounded-2xl bg-card border border-border animate-pulse" />;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover p-3 rounded-lg border border-border shadow-executive-popover text-xs space-y-1">
          <div className="font-semibold text-foreground mb-1">{label}</div>
          <div className="flex items-center justify-between gap-4 text-positive font-semibold tabular-nums">
            <span>Inflow:</span>
            <span>{formatCAD(payload[0]?.value || 0)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-negative font-semibold tabular-nums">
            <span>Outflow:</span>
            <span>{formatCAD(payload[1]?.value || 0)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-executive flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Cash Flow Trajectory</h3>
          <p className="text-xs text-muted-foreground">Monthly Inflows vs Outflows ($CAD)</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-positive">
            <span className="w-2 h-2 rounded-full bg-positive" />
            <span>Inflow</span>
          </div>
          <div className="flex items-center gap-1.5 text-negative">
            <span className="w-2 h-2 rounded-full bg-negative" />
            <span>Outflow</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--positive))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--positive))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--negative))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--negative))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.6)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="income" stroke="hsl(var(--positive))" strokeWidth={2} fillOpacity={1} fill="url(#incomeGrad)" />
            <Area type="monotone" dataKey="expense" stroke="hsl(var(--negative))" strokeWidth={2} fillOpacity={1} fill="url(#expenseGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
