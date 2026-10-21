"use client";

import React, { useState, useEffect, useMemo } from "react";
import { formatCAD, CategoryItem } from "@financeos/shared";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Filter,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Layers,
  ChevronRight,
  Check,
  X,
  Search,
  Sparkles,
  Percent,
  Flame,
  GitCompare,
  Plus,
  Trash2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { CHART_PALETTE } from "@/lib/utils";

const COLORS = CHART_PALETTE;

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [timeframe, setTimeframe] = useState<"all" | "1y" | "90d" | "30d">("all");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active view section tab
  const [activeTab, setActiveTab] = useState<"overview" | "monthly_breakdown" | "side_by_side" | "cohort_comparison">("overview");

  // Monthly breakdown state
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [monthlyFlowFilter, setMonthlyFlowFilter] = useState<"all" | "outflow" | "inflow">("outflow");
  const [showMatrixView, setShowMatrixView] = useState(false);

  // Side-by-side comparison state
  const [comparisonType, setComparisonType] = useState<"categories" | "inflow_vs_outflow">("categories");
  const [compareCatA, setCompareCatA] = useState<string>("");
  const [compareCatB, setCompareCatB] = useState<string>("");

  // Transaction Cohort comparison state ("Bunch A" vs "Bunch B")
  const [cohortAIds, setCohortAIds] = useState<string[]>([]);
  const [cohortBIds, setCohortBIds] = useState<string[]>([]);
  const [cohortSearch, setCohortSearch] = useState("");
  const [cohortTarget, setCohortTarget] = useState<"A" | "B">("A");

  const loadData = async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    try {
      const [txData, accData, catData] = await Promise.all([
        fetch("/api/transactions?limit=5000").then((r) => r.json()),
        fetch("/api/accounts").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json()),
      ]);
      setTransactions(txData.transactions || []);
      setAccounts(Array.isArray(accData) ? accData : accData?.accounts || []);
      setCategories(catData?.categories || []);
      if (showToast) toast.success("Analytics metrics and transactions refreshed");
    } catch (err: any) {
      if (showToast) toast.error("Error refreshing analytics data");
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData(false);
  }, []);

  // Filtered transactions based on global timeframe
  const filteredTxs = useMemo(() => {
    if (timeframe === "all") return transactions;
    const now = new Date();
    const cutoff = new Date();
    if (timeframe === "30d") cutoff.setDate(now.getDate() - 30);
    else if (timeframe === "90d") cutoff.setDate(now.getDate() - 90);
    else if (timeframe === "1y") cutoff.setFullYear(now.getFullYear() - 1);

    return transactions.filter((t) => new Date(t.date) >= cutoff);
  }, [transactions, timeframe]);

  // List of all unique available months (YYYY-MM), sorted descending
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.slice(0, 7));
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // List of all unique categories
  const allCategoryNames = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => set.add(c.name));
    transactions.forEach((t) => {
      if (t.category) {
        t.category.split(",").forEach((c: string) => {
          const trimmed = c.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [categories, transactions]);

  // Default side-by-side categories when available
  useEffect(() => {
    if (allCategoryNames.length >= 2) {
      if (!compareCatA) {
        const found = allCategoryNames.find((c) => c.toLowerCase().includes("food") || c.toLowerCase().includes("dining")) || allCategoryNames[0];
        setCompareCatA(found);
      }
      if (!compareCatB) {
        const found = allCategoryNames.find((c) => c.toLowerCase().includes("grocer")) || allCategoryNames[1];
        setCompareCatB(found);
      }
    }
  }, [allCategoryNames, compareCatA, compareCatB]);

  // Key Aggregations for the Active Timeframe
  const totalExpense = useMemo(() => {
    return filteredTxs.reduce((sum, t) => sum + (Number(t.amount) < 0 ? Math.abs(Number(t.amount)) : 0), 0);
  }, [filteredTxs]);

  const totalIncome = useMemo(() => {
    return filteredTxs.reduce((sum, t) => sum + (Number(t.amount) > 0 ? Number(t.amount) : 0), 0);
  }, [filteredTxs]);

  const netCashFlow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Monthly Breakdown Trend (All Months ascending)
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expense: number; net: number; savingsRate: number }>();
    const sorted = [...filteredTxs].sort((a, b) => a.date.localeCompare(b.date));

    for (const t of sorted) {
      const ym = t.date.slice(0, 7);
      if (!map.has(ym)) {
        map.set(ym, { month: ym, income: 0, expense: 0, net: 0, savingsRate: 0 });
      }
      const entry = map.get(ym)!;
      const amt = Number(t.amount);
      if (amt > 0) {
        entry.income += amt;
      } else {
        entry.expense += Math.abs(amt);
      }
      entry.net = Math.round((entry.income - entry.expense) * 100) / 100;
      entry.savingsRate = entry.income > 0 ? Math.round(((entry.income - entry.expense) / entry.income) * 100) : 0;
    }
    return Array.from(map.values()).slice(-14);
  }, [filteredTxs]);

  // Average monthly burn rate
  const monthlyBurnRate = useMemo(() => {
    const count = Math.max(1, monthlyData.length);
    return Math.round(totalExpense / count);
  }, [totalExpense, monthlyData]);

  // Essential vs Discretionary Spend Ratio
  const essentialRatio = useMemo(() => {
    let essential = 0;
    let discretionary = 0;
    const essentialKeywords = ["grocer", "rent", "housing", "utilit", "health", "medical", "insurance", "transit", "gas"];

    for (const t of filteredTxs) {
      const amt = Number(t.amount);
      if (amt < 0) {
        const cat = (t.category || "").toLowerCase();
        const desc = (t.description || "").toLowerCase();
        const isEss = essentialKeywords.some((k) => cat.includes(k) || desc.includes(k));
        if (isEss) essential += Math.abs(amt);
        else discretionary += Math.abs(amt);
      }
    }
    const total = essential + discretionary;
    return {
      essential: Math.round(essential),
      discretionary: Math.round(discretionary),
      percentEssential: total > 0 ? Math.round((essential / total) * 100) : 0,
      percentDiscretionary: total > 0 ? Math.round((discretionary / total) * 100) : 0,
    };
  }, [filteredTxs]);

  // Category Breakdown for the currently selected Month (or All Time)
  const categoryMonthlyBreakdown = useMemo(() => {
    const txsToUse = selectedMonth === "all" ? filteredTxs : filteredTxs.filter((t) => t.date.startsWith(selectedMonth));

    const map = new Map<
      string,
      {
        name: string;
        inflow: number;
        outflow: number;
        net: number;
        count: number;
        inflowCount: number;
        outflowCount: number;
        color?: string;
      }
    >();

    for (const t of txsToUse) {
      const amt = Number(t.amount);
      const cats = t.category ? t.category.split(",").map((s: string) => s.trim()).filter(Boolean) : ["General"];

      for (const cat of cats) {
        if (!map.has(cat)) {
          const matchedMeta = categories.find((c) => c.name.toLowerCase() === cat.toLowerCase());
          map.set(cat, {
            name: cat,
            inflow: 0,
            outflow: 0,
            net: 0,
            count: 0,
            inflowCount: 0,
            outflowCount: 0,
            color: matchedMeta?.color || undefined,
          });
        }
        const item = map.get(cat)!;
        item.count += 1;
        if (amt > 0) {
          item.inflow += amt;
          item.inflowCount += 1;
        } else {
          item.outflow += Math.abs(amt);
          item.outflowCount += 1;
        }
        item.net = Math.round((item.inflow - item.outflow) * 100) / 100;
      }
    }

    const list = Array.from(map.values()).map((c) => ({
      ...c,
      inflow: Math.round(c.inflow * 100) / 100,
      outflow: Math.round(c.outflow * 100) / 100,
    }));

    if (monthlyFlowFilter === "outflow") {
      return list.filter((c) => c.outflow > 0).sort((a, b) => b.outflow - a.outflow);
    } else if (monthlyFlowFilter === "inflow") {
      return list.filter((c) => c.inflow > 0).sort((a, b) => b.inflow - a.inflow);
    } else {
      return list.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    }
  }, [filteredTxs, selectedMonth, monthlyFlowFilter, categories]);

  // Total amount for the selected month to compute % share
  const selectedMonthTotals = useMemo(() => {
    const txsToUse = selectedMonth === "all" ? filteredTxs : filteredTxs.filter((t) => t.date.startsWith(selectedMonth));
    let inflow = 0;
    let outflow = 0;
    for (const t of txsToUse) {
      const a = Number(t.amount);
      if (a > 0) inflow += a;
      else outflow += Math.abs(a);
    }
    return {
      inflow: Math.round(inflow * 100) / 100,
      outflow: Math.round(outflow * 100) / 100,
      net: Math.round((inflow - outflow) * 100) / 100,
      savingsRate: inflow > 0 ? Math.round(((inflow - outflow) / inflow) * 100) : 0,
    };
  }, [filteredTxs, selectedMonth]);

  // Cross-Month Matrix Data (Rows: Categories, Columns: Months)
  const crossMonthMatrix = useMemo(() => {
    const topMonths = availableMonths.slice(0, 6).reverse(); // Last 6 months chronological
    const categoryTotals = new Map<string, Record<string, number>>();

    for (const t of filteredTxs) {
      const ym = t.date.slice(0, 7);
      if (!topMonths.includes(ym)) continue;
      const amt = monthlyFlowFilter === "inflow" ? (t.amount > 0 ? t.amount : 0) : t.amount < 0 ? Math.abs(t.amount) : 0;
      if (amt === 0) continue;

      const cats = t.category ? t.category.split(",").map((c: string) => c.trim()).filter(Boolean) : ["General"];
      for (const cat of cats) {
        if (!categoryTotals.has(cat)) {
          categoryTotals.set(cat, {});
        }
        const row = categoryTotals.get(cat)!;
        row[ym] = (row[ym] || 0) + amt;
      }
    }

    const rows = Array.from(categoryTotals.entries()).map(([cat, monthMap]) => {
      let sum = 0;
      topMonths.forEach((m) => {
        sum += monthMap[m] || 0;
      });
      return {
        category: cat,
        months: monthMap,
        total: Math.round(sum * 100) / 100,
      };
    });

    rows.sort((a, b) => b.total - a.total);
    return { months: topMonths, rows: rows.slice(0, 15) };
  }, [filteredTxs, availableMonths, monthlyFlowFilter]);

  // Side-by-Side Category Comparison Computations
  const categoryComparisonData = useMemo(() => {
    if (!compareCatA && !compareCatB) return null;

    const computeCatMetrics = (catName: string) => {
      const clean = catName.trim().toLowerCase();
      const matched = filteredTxs.filter((t) => {
        if (!t.category) return false;
        return t.category.toLowerCase().includes(clean);
      });

      let totalOutflow = 0;
      let totalInflow = 0;
      let count = matched.length;
      let maxTx = 0;
      const merchantCounts = new Map<string, number>();

      for (const t of matched) {
        const a = Number(t.amount);
        if (a < 0) {
          totalOutflow += Math.abs(a);
          if (Math.abs(a) > maxTx) maxTx = Math.abs(a);
        } else {
          totalInflow += a;
        }
        const m = t.merchant || t.description || "Unknown";
        merchantCounts.set(m, (merchantCounts.get(m) || 0) + 1);
      }

      const topMerchant = Array.from(merchantCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
      const avgTx = count > 0 ? (totalOutflow || totalInflow) / count : 0;

      return {
        name: catName,
        count,
        totalOutflow: Math.round(totalOutflow * 100) / 100,
        totalInflow: Math.round(totalInflow * 100) / 100,
        avgTx: Math.round(avgTx * 100) / 100,
        maxTx: Math.round(maxTx * 100) / 100,
        topMerchant,
      };
    };

    const metricsA = computeCatMetrics(compareCatA);
    const metricsB = computeCatMetrics(compareCatB);

    // Monthly side-by-side progression chart data
    const monthMap = new Map<string, { month: string; [key: string]: any }>();
    const months = availableMonths.slice(0, 10).reverse();

    months.forEach((m) => {
      monthMap.set(m, { month: m, [compareCatA]: 0, [compareCatB]: 0 });
    });

    for (const t of filteredTxs) {
      const ym = t.date.slice(0, 7);
      if (!monthMap.has(ym)) continue;
      const row = monthMap.get(ym)!;
      const amt = Math.abs(Number(t.amount));

      if (t.category && t.category.toLowerCase().includes(compareCatA.toLowerCase())) {
        row[compareCatA] = Math.round(((row[compareCatA] || 0) + amt) * 100) / 100;
      }
      if (t.category && t.category.toLowerCase().includes(compareCatB.toLowerCase())) {
        row[compareCatB] = Math.round(((row[compareCatB] || 0) + amt) * 100) / 100;
      }
    }

    return {
      metricsA,
      metricsB,
      chartData: Array.from(monthMap.values()),
    };
  }, [filteredTxs, compareCatA, compareCatB, availableMonths]);

  // Specific Transaction Cohort Comparison Computations ("Bunch A" vs "Bunch B")
  const cohortMetrics = useMemo(() => {
    const txMap = new Map<string, any>(transactions.map((t) => [t.id, t]));

    const computeCohort = (ids: string[], label: string) => {
      const txs = ids.map((id) => txMap.get(id)).filter(Boolean);
      let totalAmount = 0;
      let totalDebit = 0;
      let totalCredit = 0;
      let maxTx = 0;
      let minTx = Infinity;
      const catCount = new Map<string, number>();

      for (const t of txs) {
        const a = Number(t.amount);
        totalAmount += a;
        if (a < 0) totalDebit += Math.abs(a);
        else totalCredit += a;

        const absA = Math.abs(a);
        if (absA > maxTx) maxTx = absA;
        if (absA < minTx) minTx = absA;

        const c = t.category || "General";
        catCount.set(c, (catCount.get(c) || 0) + 1);
      }

      const topCat = Array.from(catCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
      const count = txs.length;
      const avgTx = count > 0 ? (totalDebit || totalCredit) / count : 0;

      // Date range
      const dates = txs.map((t) => t.date).sort();
      const dateRange = dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : "None";

      return {
        label,
        txs,
        count,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        avgTx: Math.round(avgTx * 100) / 100,
        maxTx: count > 0 ? Math.round(maxTx * 100) / 100 : 0,
        minTx: count > 0 && minTx !== Infinity ? Math.round(minTx * 100) / 100 : 0,
        topCat,
        dateRange,
      };
    };

    const bunchA = computeCohort(cohortAIds, "Bunch A");
    const bunchB = computeCohort(cohortBIds, "Bunch B");

    // Delta differences
    const deltaDebit = Math.round((bunchA.totalDebit - bunchB.totalDebit) * 100) / 100;
    const deltaAvg = Math.round((bunchA.avgTx - bunchB.avgTx) * 100) / 100;

    return { bunchA, bunchB, deltaDebit, deltaAvg };
  }, [transactions, cohortAIds, cohortBIds]);

  // Filtered search list for picking cohort transactions
  const searchedTransactions = useMemo(() => {
    if (!cohortSearch.trim()) return transactions.slice(0, 15);
    const q = cohortSearch.toLowerCase().trim();
    return transactions
      .filter(
        (t) =>
          (t.merchant && t.merchant.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          t.date.includes(q) ||
          String(t.amount).includes(q)
      )
      .slice(0, 20);
  }, [transactions, cohortSearch]);

  // Spending by Account
  const accountSpending = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filteredTxs) {
      const amt = Number(t.amount);
      if (amt < 0) {
        const acc = Array.isArray(accounts) ? accounts.find((a) => a.id === t.account_id) : undefined;
        const name = acc ? `${acc.bank_name} ${acc.account_name}` : "Other Account";
        map.set(name, (map.get(name) || 0) + Math.abs(amt));
      }
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTxs, accounts]);

  // Top 10 Merchants
  const topMerchants = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filteredTxs) {
      const amt = Number(t.amount);
      if (amt < 0) {
        const name = t.merchant || t.description || "Other";
        map.set(name, (map.get(name) || 0) + Math.abs(amt));
      }
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [filteredTxs]);

  if (!mounted) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-pulse">
        <div className="h-8 bg-muted rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="h-28 bg-muted rounded-2xl" />
          <div className="h-28 bg-muted rounded-2xl" />
          <div className="h-28 bg-muted rounded-2xl" />
          <div className="h-28 bg-muted rounded-2xl" />
        </div>
        <div className="h-80 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 animate-in fade-in duration-300">
      {/* Page Title & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Financial Analytics & Intelligence</h1>
              <p className="text-xs text-muted-foreground">
                Deep analytical matrix, category breakdown, side-by-side comparators & transaction cohort analysis
              </p>
            </div>
          </div>
        </div>

        {/* Actions & Global Timeframe Selector */}
        <div className="flex items-center gap-2.5">
          {/* Refresh Button */}
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            title="Refresh Analytics Data"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          {/* Global Timeframe Selector */}
          <div className="flex items-center gap-1.5 bg-secondary/80 p-1 rounded-xl border border-border">
            {(["all", "1y", "90d", "30d"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  timeframe === t
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {t === "all" ? "All Time" : t === "1y" ? "Past 1 Year" : t === "90d" ? "Past 90 Days" : "Past 30 Days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main View Mode Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-border/60 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: "overview", label: "Executive Overview", icon: BarChart3 },
          { id: "monthly_breakdown", label: "Monthly Category Breakdown", icon: Calendar },
          { id: "side_by_side", label: "Side-by-Side Comparator", icon: Scale },
          { id: "cohort_comparison", label: "Transaction Bunch Comparison", icon: GitCompare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-card text-foreground border border-border shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: EXECUTIVE OVERVIEW & KEY FINANCIAL METRICS
          ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metric KPI Cards (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card p-5 rounded-2xl border border-border shadow-xs hover:border-border/80 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Inflow</span>
                <span className="p-1.5 rounded-lg bg-positive/10 text-positive">
                  <ArrowDownLeft className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-positive mt-2">{formatCAD(totalIncome)}</div>
              <p className="text-[11px] text-muted-foreground mt-1">Deposits, payroll & refunds</p>
            </div>

            <div className="bg-card p-5 rounded-2xl border border-border shadow-xs hover:border-border/80 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Outflow</span>
                <span className="p-1.5 rounded-lg bg-negative/10 text-negative">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-negative mt-2">{formatCAD(totalExpense)}</div>
              <p className="text-[11px] text-muted-foreground mt-1">Expenditure & credit charges</p>
            </div>

            <div className="bg-card p-5 rounded-2xl border border-border shadow-xs hover:border-border/80 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Cash Retained</span>
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div
                className={`text-2xl font-black mt-2 ${
                  netCashFlow >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {formatCAD(netCashFlow)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Savings rate: <span className="font-bold text-foreground">{savingsRate.toFixed(1)}%</span>
              </p>
            </div>

            <div className="bg-card p-5 rounded-2xl border border-border shadow-xs hover:border-border/80 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Burn Rate</span>
                <span className="p-1.5 rounded-lg bg-warning/10 text-warning">
                  <Flame className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-foreground mt-2">{formatCAD(monthlyBurnRate)}/mo</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Discretionary spend: <span className="font-bold text-foreground">{essentialRatio.percentDiscretionary}%</span>
              </p>
            </div>
          </div>

          {/* Income vs Outflow Trajectory Chart */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-foreground">Monthly Inflow vs. Outflow Trajectory</h3>
                <p className="text-xs text-muted-foreground">Historical comparison of monthly income against total spend</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-positive font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-positive" /> Inflows
                </span>
                <span className="flex items-center gap-1.5 text-negative font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-negative" /> Outflows
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCAD(Number(val)), ""]}
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "12px",
                      color: "#FFF",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                  <Bar dataKey="income" name="Inflow" fill="hsl(var(--positive))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Outflow" fill="hsl(var(--negative))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 10 Merchants & Spending by Account */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-2xl border border-border shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Top 10 Outflow Merchants</h3>
                  <p className="text-xs text-muted-foreground">Highest allocation by vendor and counterparty</p>
                </div>
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-3.5 mt-4">
                {topMerchants.map((m, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-foreground truncate max-w-[240px]">
                        {idx + 1}. {m.name}
                      </span>
                      <span className="font-mono font-bold text-foreground">{formatCAD(m.amount)}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(m.amount / (topMerchants[0]?.amount || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-border shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Volume by Connected Node</h3>
                  <p className="text-xs text-muted-foreground">Distribution across cards and bank chequing nodes</p>
                </div>
                <Layers className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-3 mt-4">
                {accountSpending.map((acc, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-secondary/40 border border-border/80 rounded-xl flex items-center justify-between hover:bg-secondary/70 transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">{acc.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {Math.round((acc.amount / (totalExpense || 1)) * 100)}% of total debit activity
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-foreground">{formatCAD(acc.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MONTHLY CATEGORY-WISE INFLOW / OUTFLOW BREAKDOWN
          ========================================================================= */}
      {activeTab === "monthly_breakdown" && (
        <div className="space-y-6">
          {/* Controls Bar: Month Picker + Inflow/Outflow Filter + View Mode Toggle */}
          <div className="bg-card p-5 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Select Month:</span>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-secondary border border-border text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">All Months Combined</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Inflow vs Outflow toggle */}
              <div className="inline-flex items-center p-0.5 rounded-xl bg-secondary border border-border ml-2">
                <button
                  onClick={() => setMonthlyFlowFilter("outflow")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    monthlyFlowFilter === "outflow"
                      ? "bg-negative text-negative-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Outflows
                </button>
                <button
                  onClick={() => setMonthlyFlowFilter("inflow")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    monthlyFlowFilter === "inflow"
                      ? "bg-positive text-positive-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Inflows
                </button>
                <button
                  onClick={() => setMonthlyFlowFilter("all")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    monthlyFlowFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Net Margin
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowMatrixView(!showMatrixView)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                showMatrixView
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary border-border text-foreground hover:bg-secondary/80"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showMatrixView ? "Switch to Ranked List" : "Multi-Month Matrix View"}</span>
            </button>
          </div>

          {/* Month Summary KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-xl border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Month Outflow</span>
              <div className="text-xl font-black text-negative mt-1">{formatCAD(selectedMonthTotals.outflow)}</div>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Month Inflow</span>
              <div className="text-xl font-black text-positive mt-1">{formatCAD(selectedMonthTotals.inflow)}</div>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Month Net Cash</span>
              <div
                className={`text-xl font-black mt-1 ${
                  selectedMonthTotals.net >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {formatCAD(selectedMonthTotals.net)}
              </div>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Savings Rate</span>
              <div className="text-xl font-black text-foreground mt-1">{selectedMonthTotals.savingsRate}%</div>
            </div>
          </div>

          {/* Matrix or Ranked List View */}
          {showMatrixView ? (
            /* Multi-Month Cross-Tabulation Matrix */
            <div className="bg-card p-6 rounded-2xl border border-border shadow-xs overflow-x-auto">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-foreground">
                  Multi-Month Category Matrix ({monthlyFlowFilter.toUpperCase()})
                </h3>
                <p className="text-xs text-muted-foreground">Side-by-side category evolution across the last 6 active months</p>
              </div>

              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="p-3 font-bold text-foreground">Category</th>
                    {crossMonthMatrix.months.map((m) => (
                      <th key={m} className="p-3 font-bold text-foreground text-right">
                        {m}
                      </th>
                    ))}
                    <th className="p-3 font-bold text-foreground text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {crossMonthMatrix.rows.map((row) => (
                    <tr key={row.category} className="hover:bg-secondary/30 transition-all">
                      <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span>{row.category}</span>
                      </td>
                      {crossMonthMatrix.months.map((m) => (
                        <td key={m} className="p-3 font-mono text-right text-muted-foreground">
                          {row.months[m] ? formatCAD(row.months[m]) : "—"}
                        </td>
                      ))}
                      <td className="p-3 font-mono font-bold text-right text-foreground">{formatCAD(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Ranked Category Cards & Visual Bar Chart */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category Breakdown Table */}
              <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-border shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Category Breakdown for {selectedMonth === "all" ? "All Time" : selectedMonth}
                    </h3>
                    <p className="text-xs text-muted-foreground">Ranked by volume with transaction velocity</p>
                  </div>
                </div>

                <div className="divide-y divide-border/60">
                  {categoryMonthlyBreakdown.slice(0, 16).map((c, idx) => {
                    const activeVal =
                      monthlyFlowFilter === "outflow"
                        ? c.outflow
                        : monthlyFlowFilter === "inflow"
                        ? c.inflow
                        : Math.abs(c.net);
                    const totalRef =
                      monthlyFlowFilter === "outflow"
                        ? selectedMonthTotals.outflow
                        : monthlyFlowFilter === "inflow"
                        ? selectedMonthTotals.inflow
                        : Math.abs(selectedMonthTotals.net);
                    const share = totalRef > 0 ? (activeVal / totalRef) * 100 : 0;

                    return (
                      <div key={c.name} className="py-3.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 font-mono text-muted-foreground font-semibold">{idx + 1}.</span>
                            <span className="font-bold text-foreground">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                              {c.count} txs
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-foreground">{formatCAD(activeVal)}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">({share.toFixed(1)}%)</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              monthlyFlowFilter === "inflow" ? "bg-positive" : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(2, share))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Visual Donut Chart */}
              <div className="bg-card p-6 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-foreground">Sector Allocation</h3>
                    <PieIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryMonthlyBreakdown.slice(0, 8).map((c) => ({
                            name: c.name,
                            value:
                              monthlyFlowFilter === "outflow"
                                ? c.outflow
                                : monthlyFlowFilter === "inflow"
                                ? c.inflow
                                : Math.abs(c.net),
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryMonthlyBreakdown.slice(0, 8).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: any) => [formatCAD(Number(val)), ""]}
                          contentStyle={{
                            backgroundColor: "rgba(15, 23, 42, 0.95)",
                            borderRadius: "10px",
                            color: "#FFF",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {categoryMonthlyBreakdown.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground truncate max-w-[130px]">{c.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-foreground">
                        {formatCAD(
                          monthlyFlowFilter === "outflow"
                            ? c.outflow
                            : monthlyFlowFilter === "inflow"
                            ? c.inflow
                            : Math.abs(c.net)
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: SIDE-BY-SIDE COMPARATOR (CATEGORIES OR INFLOW VS OUTFLOW)
          ========================================================================= */}
      {activeTab === "side_by_side" && (
        <div className="space-y-6">
          {/* Comparison Mode Toggle */}
          <div className="bg-card p-5 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Side-by-Side Analytical Comparison</h3>
              <p className="text-xs text-muted-foreground">Cross-examine two categories or inflows vs outflows across months</p>
            </div>

            <div className="inline-flex items-center p-0.5 rounded-xl bg-secondary border border-border">
              <button
                onClick={() => setComparisonType("categories")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  comparisonType === "categories"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Compare Two Categories
              </button>
              <button
                onClick={() => setComparisonType("inflow_vs_outflow")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  comparisonType === "inflow_vs_outflow"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Inflows vs. Outflows
              </button>
            </div>
          </div>

          {comparisonType === "categories" && categoryComparisonData && (
            <div className="space-y-6">
              {/* Category Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-card rounded-2xl border-2 border-accent/30">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-accent">Category A</span>
                  <select
                    value={compareCatA}
                    onChange={(e) => setCompareCatA(e.target.value)}
                    className="w-full mt-2 px-3 py-2 text-sm font-bold rounded-xl bg-secondary border border-border text-foreground focus:outline-none"
                  >
                    {allCategoryNames.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-card rounded-2xl border-2 border-accent/30">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-accent">Category B</span>
                  <select
                    value={compareCatB}
                    onChange={(e) => setCompareCatB(e.target.value)}
                    className="w-full mt-2 px-3 py-2 text-sm font-bold rounded-xl bg-secondary border border-border text-foreground focus:outline-none"
                  >
                    {allCategoryNames.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Side-by-Side Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card p-4 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Outflow</span>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between font-mono font-bold text-accent">
                      <span>A:</span> {formatCAD(categoryComparisonData.metricsA.totalOutflow)}
                    </div>
                    <div className="flex justify-between font-mono font-bold text-accent">
                      <span>B:</span> {formatCAD(categoryComparisonData.metricsB.totalOutflow)}
                    </div>
                  </div>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Avg Transaction</span>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between font-mono font-bold text-accent">
                      <span>A:</span> {formatCAD(categoryComparisonData.metricsA.avgTx)}
                    </div>
                    <div className="flex justify-between font-mono font-bold text-accent">
                      <span>B:</span> {formatCAD(categoryComparisonData.metricsB.avgTx)}
                    </div>
                  </div>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Transaction Count</span>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-accent">
                      <span>A:</span> {categoryComparisonData.metricsA.count} txs
                    </div>
                    <div className="flex justify-between font-bold text-accent">
                      <span>B:</span> {categoryComparisonData.metricsB.count} txs
                    </div>
                  </div>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Highest Single Tx</span>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between font-mono font-bold text-accent">
                      <span>A:</span> {formatCAD(categoryComparisonData.metricsA.maxTx)}
                    </div>
                    <div className="flex justify-between font-mono font-bold text-accent">
                      <span>B:</span> {formatCAD(categoryComparisonData.metricsB.maxTx)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Monthly Bar Chart */}
              <div className="bg-card p-6 rounded-2xl border border-border shadow-xs">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Monthly Spend Trend: {compareCatA} vs. {compareCatB}
                    </h3>
                    <p className="text-xs text-muted-foreground">Side-by-side monthly outflow volume</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-accent font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent" /> {compareCatA}
                    </span>
                    <span className="flex items-center gap-1.5 text-accent font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent" /> {compareCatB}
                    </span>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryComparisonData.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(val: any) => [formatCAD(Number(val)), ""]}
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.95)",
                          borderRadius: "12px",
                          color: "#FFF",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      />
                      <Bar dataKey={compareCatA} name={compareCatA} fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={compareCatB} name={compareCatB} fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {comparisonType === "inflow_vs_outflow" && (
            <div className="space-y-6">
              {/* Inflow vs Outflow Dual Metric Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-6 bg-card rounded-2xl border-2 border-positive/20">
                  <span className="text-xs font-bold text-positive uppercase tracking-wider">Total Inflow Volume</span>
                  <div className="text-3xl font-black text-positive mt-2">{formatCAD(totalIncome)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Average {formatCAD(totalIncome / Math.max(1, monthlyData.length))}/mo</p>
                </div>

                <div className="p-6 bg-card rounded-2xl border-2 border-negative/20">
                  <span className="text-xs font-bold text-negative uppercase tracking-wider">Total Outflow Volume</span>
                  <div className="text-3xl font-black text-negative mt-2">{formatCAD(totalExpense)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Average {formatCAD(totalExpense / Math.max(1, monthlyData.length))}/mo</p>
                </div>

                <div className="p-6 bg-card rounded-2xl border-2 border-primary/20">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Cumulative Net Delta</span>
                  <div className={`text-3xl font-black mt-2 ${netCashFlow >= 0 ? "text-positive" : "text-negative"}`}>
                    {formatCAD(netCashFlow)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Coverage ratio: {(totalIncome / (totalExpense || 1)).toFixed(2)}x
                  </p>
                </div>
              </div>

              {/* Monthly Net Margin Chart */}
              <div className="bg-card p-6 rounded-2xl border border-border shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Net Monthly Cash Flow Margin</h3>
                    <p className="text-xs text-muted-foreground">Positive indicates retained capital; negative indicates drawdown</p>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(val: any) => [formatCAD(Number(val)), "Net Flow"]}
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.95)",
                          borderRadius: "12px",
                          color: "#FFF",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      />
                      <Bar
                        dataKey="net"
                        name="Net Cash Flow"
                        fill="hsl(var(--chart-1))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: SPECIFIC TRANSACTION COHORT COMPARISON ("BUNCH A" VS "BUNCH B")
          ========================================================================= */}
      {activeTab === "cohort_comparison" && (
        <div className="space-y-6">
          {/* Header Explanation */}
          <div className="bg-card p-5 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Transaction Cohort Comparator</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Select any specific set of transactions into Bunch A and another set into Bunch B to compare amounts, averages, and velocity side-by-side
              </p>
            </div>

            {/* Quick Cohort Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-muted-foreground">Quick Presets:</span>
              <button
                onClick={() => {
                  const ubers = transactions
                    .filter((t) => (t.merchant || t.description || "").toLowerCase().includes("uber"))
                    .slice(0, 10)
                    .map((t) => t.id);
                  const transit = transactions
                    .filter((t) => (t.category || "").toLowerCase().includes("transport") && !(t.merchant || "").toLowerCase().includes("uber"))
                    .slice(0, 10)
                    .map((t) => t.id);
                  setCohortAIds(ubers);
                  setCohortBIds(transit);
                }}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-secondary border border-border text-foreground hover:bg-secondary/80 cursor-pointer"
              >
                Uber vs Transit
              </button>

              <button
                onClick={() => {
                  const dining = transactions
                    .filter((t) => (t.category || "").toLowerCase().includes("food") || (t.category || "").toLowerCase().includes("dining"))
                    .slice(0, 12)
                    .map((t) => t.id);
                  const grocers = transactions
                    .filter((t) => (t.category || "").toLowerCase().includes("grocer"))
                    .slice(0, 12)
                    .map((t) => t.id);
                  setCohortAIds(dining);
                  setCohortBIds(grocers);
                }}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-secondary border border-border text-foreground hover:bg-secondary/80 cursor-pointer"
              >
                Dining vs Groceries
              </button>

              <button
                onClick={() => {
                  setCohortAIds([]);
                  setCohortBIds([]);
                }}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-negative hover:bg-negative/10 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Side-by-Side Bunch Comparison KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bunch A Card */}
            <div className="bg-card p-5 rounded-2xl border-2 border-accent/40 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-accent" />
                  <h4 className="font-bold text-foreground text-sm">Bunch A ({cohortMetrics.bunchA.count} items)</h4>
                </div>
                <span className="font-mono font-black text-accent text-lg">
                  {formatCAD(cohortMetrics.bunchA.totalDebit || cohortMetrics.bunchA.totalCredit)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs bg-secondary/50 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Average Tx</span>
                  <div className="font-mono font-bold text-foreground mt-0.5">{formatCAD(cohortMetrics.bunchA.avgTx)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Max Single</span>
                  <div className="font-mono font-bold text-foreground mt-0.5">{formatCAD(cohortMetrics.bunchA.maxTx)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Top Category</span>
                  <div className="font-bold text-foreground truncate mt-0.5">{cohortMetrics.bunchA.topCat}</div>
                </div>
              </div>

              {/* Transactions in Bunch A */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {cohortMetrics.bunchA.txs.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-2 rounded-xl bg-secondary/40 border border-border/70 flex items-center justify-between text-xs"
                  >
                    <div className="truncate max-w-[200px]">
                      <div className="font-bold text-foreground truncate">{t.merchant || t.description}</div>
                      <div className="text-[10px] text-muted-foreground">{t.date} • {t.category}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">{formatCAD(t.amount)}</span>
                      <button
                        onClick={() => setCohortAIds(cohortAIds.filter((id) => id !== t.id))}
                        className="text-muted-foreground hover:text-negative transition-all p-1"
                        title="Remove from Bunch A"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {cohortMetrics.bunchA.txs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No transactions added to Bunch A yet</p>
                )}
              </div>
            </div>

            {/* Bunch B Card */}
            <div className="bg-card p-5 rounded-2xl border-2 border-accent/40 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-accent" />
                  <h4 className="font-bold text-foreground text-sm">Bunch B ({cohortMetrics.bunchB.count} items)</h4>
                </div>
                <span className="font-mono font-black text-accent text-lg">
                  {formatCAD(cohortMetrics.bunchB.totalDebit || cohortMetrics.bunchB.totalCredit)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs bg-secondary/50 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Average Tx</span>
                  <div className="font-mono font-bold text-foreground mt-0.5">{formatCAD(cohortMetrics.bunchB.avgTx)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Max Single</span>
                  <div className="font-mono font-bold text-foreground mt-0.5">{formatCAD(cohortMetrics.bunchB.maxTx)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Top Category</span>
                  <div className="font-bold text-foreground truncate mt-0.5">{cohortMetrics.bunchB.topCat}</div>
                </div>
              </div>

              {/* Transactions in Bunch B */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {cohortMetrics.bunchB.txs.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-2 rounded-xl bg-secondary/40 border border-border/70 flex items-center justify-between text-xs"
                  >
                    <div className="truncate max-w-[200px]">
                      <div className="font-bold text-foreground truncate">{t.merchant || t.description}</div>
                      <div className="text-[10px] text-muted-foreground">{t.date} • {t.category}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">{formatCAD(t.amount)}</span>
                      <button
                        onClick={() => setCohortBIds(cohortBIds.filter((id) => id !== t.id))}
                        className="text-muted-foreground hover:text-negative transition-all p-1"
                        title="Remove from Bunch B"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {cohortMetrics.bunchB.txs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No transactions added to Bunch B yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Delta Summary Comparison */}
          {(cohortMetrics.bunchA.count > 0 || cohortMetrics.bunchB.count > 0) && (
            <div className="p-4 bg-secondary/30 rounded-2xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">Difference (Bunch A - Bunch B):</span>
                <span className="font-mono font-black text-foreground">
                  {cohortMetrics.deltaDebit > 0 ? `+${formatCAD(cohortMetrics.deltaDebit)}` : formatCAD(cohortMetrics.deltaDebit)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>
                  Avg Tx Delta:{" "}
                  <strong className="text-foreground">
                    {cohortMetrics.deltaAvg > 0 ? `+${formatCAD(cohortMetrics.deltaAvg)}` : formatCAD(cohortMetrics.deltaAvg)}
                  </strong>
                </span>
                <span>
                  Volume Ratio:{" "}
                  <strong className="text-foreground">
                    {cohortMetrics.bunchB.totalDebit > 0
                      ? `${(cohortMetrics.bunchA.totalDebit / cohortMetrics.bunchB.totalDebit).toFixed(2)}x`
                      : "—"}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* Interactive Transaction Search & Adder Box */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground">Add Transactions to Cohorts</h4>
                <p className="text-xs text-muted-foreground">Search by merchant, description, amount, or date</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Add destination:</span>
                <button
                  onClick={() => setCohortTarget("A")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    cohortTarget === "A"
                      ? "bg-accent text-accent-foreground border-accent shadow-xs"
                      : "bg-secondary text-muted-foreground border-border"
                  }`}
                >
                  Bunch A
                </button>
                <button
                  onClick={() => setCohortTarget("B")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    cohortTarget === "B"
                      ? "bg-accent text-accent-foreground border-accent shadow-xs"
                      : "bg-secondary text-muted-foreground border-border"
                  }`}
                >
                  Bunch B
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transactions to include (e.g. Uber, Walmart, Tim Hortons, 2026-09)..."
                value={cohortSearch}
                onChange={(e) => setCohortSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-secondary border border-border text-foreground focus:outline-none"
              />
            </div>

            {/* Candidate List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {searchedTransactions.map((t) => {
                const inA = cohortAIds.includes(t.id);
                const inB = cohortBIds.includes(t.id);

                return (
                  <div
                    key={t.id}
                    className="p-3 bg-secondary/30 hover:bg-secondary/60 rounded-xl border border-border/60 flex items-center justify-between text-xs transition-all"
                  >
                    <div className="truncate max-w-[200px]">
                      <div className="font-bold text-foreground truncate">{t.merchant || t.description}</div>
                      <div className="text-[10px] text-muted-foreground">{t.date} • {t.category || "General"}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">{formatCAD(t.amount)}</span>
                      {cohortTarget === "A" ? (
                        <button
                          onClick={() => {
                            if (inA) setCohortAIds(cohortAIds.filter((id) => id !== t.id));
                            else setCohortAIds([...cohortAIds, t.id]);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            inA
                              ? "bg-accent text-accent-foreground"
                              : "bg-secondary hover:bg-accent/20 text-accent border border-accent/30"
                          }`}
                        >
                          {inA ? "In Bunch A" : "+ Add to A"}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (inB) setCohortBIds(cohortBIds.filter((id) => id !== t.id));
                            else setCohortBIds([...cohortBIds, t.id]);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            inB
                              ? "bg-accent text-accent-foreground"
                              : "bg-secondary hover:bg-accent/20 text-accent border border-accent/30"
                          }`}
                        >
                          {inB ? "In Bunch B" : "+ Add to B"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
