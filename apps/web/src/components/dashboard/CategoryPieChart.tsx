'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCAD } from '@financeos/shared';
import { CHART_PALETTE } from '@/lib/utils';

interface CategoryPieChartProps {
  data: { name: string; value: number }[];
  isLoading?: boolean;
}

const COLORS = CHART_PALETTE;

export function CategoryPieChart({ data, isLoading }: CategoryPieChartProps) {
  if (isLoading) {
    return <div className="h-72 rounded-2xl bg-card border border-border animate-pulse" />;
  }

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
      return (
        <div className="bg-popover p-3 rounded-lg border border-border shadow-executive-popover text-xs space-y-1">
          <div className="font-semibold text-foreground">{item.name}</div>
          <div className="text-foreground font-semibold tabular-nums">
            {formatCAD(item.value)} ({pct}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-executive flex flex-col justify-between">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-foreground">Spending by Category</h3>
        <p className="text-xs text-muted-foreground">Distribution across top spending areas</p>
      </div>

      <div className="h-48 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Total</span>
          <span className="text-xs font-semibold text-foreground tabular-nums">{formatCAD(total)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
        {data.slice(0, 4).map((entry, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="text-muted-foreground truncate">{entry.name}</span>
            <span className="font-semibold text-foreground ml-auto tabular-nums">{formatCAD(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
