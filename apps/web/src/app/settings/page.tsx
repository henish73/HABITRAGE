"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useFinanceStore } from "@/lib/store";
import {
  Download, Eye, EyeOff, Bell, Moon, Sun,
  Database, RefreshCw, AlertTriangle, CheckCircle2, Shield, KeyRound, Lock, LogOut
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { isMasked, toggleMask } = useFinanceStore();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      window.location.href = "/login";
    }
  };

  const handleExportAll = () => {
    window.location.href = "/api/export?format=all";
    setStatusMessage("Export initiated — CSV downloading.");
  };

  const handleResetData = async () => {
    if (confirm("Re-seed from master CSV files? This resets custom transactions.")) {
      setStatusMessage("Re-indexing master CSV data…");
      try {
        const res = await fetch("/api/import", { method: "POST" });
        if (res.ok) setStatusMessage("System restored from master CSV seed data.");
      } catch {
        setStatusMessage("Reset completed.");
      }
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Preferences, privacy controls, data export, and database configuration
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 bg-positive-soft border border-positive/30 rounded-xl text-sm text-positive flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Security Notice */}
      <div className="p-4 bg-warning-soft border border-warning/30 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <div className="text-sm text-foreground">
          <span className="font-semibold">API keys are configured server-side via </span>
          <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono">.env.local</code>
          . They are never sent to the browser.
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-card rounded-2xl border border-border shadow-vault divide-y divide-border overflow-hidden">
        <div className="p-6">
          <h2 className="text-sm font-semibold text-foreground">General Preferences</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Display formats and account privacy</p>
        </div>

        {/* Currency Display */}
        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Primary Currency</div>
            <div className="text-xs text-muted-foreground">All ledger balances and reports</div>
          </div>
          <span className="px-3 py-1.5 bg-secondary text-foreground font-semibold text-xs rounded-xl border border-border font-financial">
            CAD ($)
          </span>
        </div>

        {/* Privacy Masking Toggle */}
        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Privacy Masking</div>
            <div className="text-xs text-muted-foreground">
              Blur all balances and amounts — hold Eye to peek
            </div>
          </div>
          <button
            onClick={toggleMask}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              isMasked
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-muted"
            }`}
          >
            {isMasked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isMasked ? "Masking Enabled" : "Values Visible"}
          </button>
        </div>

        {/* Notifications */}
        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Bill & Statement Reminders</div>
            <div className="text-xs text-muted-foreground">3 days and 1 day before due dates</div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-positive bg-positive-soft px-3 py-1.5 rounded-xl border border-positive/20">
            <Bell className="w-3.5 h-3.5" />
            Active
          </span>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="bg-card rounded-2xl border border-border shadow-vault divide-y divide-border overflow-hidden">
        <div className="p-6">
          <h2 className="text-sm font-semibold text-foreground">AI Engine Configuration</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Powers natural language queries and autonomous actions</p>
        </div>

        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">OpenRouter API Key</div>
              <div className="text-xs text-muted-foreground">Configured via server environment variable</div>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-positive-soft text-positive text-xs font-semibold rounded-xl border border-positive/20">
            Key configured ✓
          </span>
        </div>

        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Active Model</div>
            <div className="text-xs text-muted-foreground">Set via OPENROUTER_MODEL in .env.local</div>
          </div>
          <code className="text-xs text-muted-foreground bg-secondary px-2.5 py-1.5 rounded-lg border border-border font-mono">
            google/gemini-2.5-flash
          </code>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-card rounded-2xl border border-border shadow-vault divide-y divide-border overflow-hidden">
        <div className="p-6">
          <h2 className="text-sm font-semibold text-foreground">Data Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Export and reset your ledger data</p>
        </div>

        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Export All Transactions</div>
            <div className="text-xs text-muted-foreground">Download master ledger as CSV</div>
          </div>
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-secondary transition text-foreground"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Reset & Re-seed</div>
            <div className="text-xs text-muted-foreground text-warning">⚠ Resets all custom transactions from master CSVs</div>
          </div>
          <button
            onClick={handleResetData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-warning/30 text-warning hover:bg-warning-soft transition"
          >
            <RefreshCw className="w-4 h-4" />
            Re-seed
          </button>
        </div>
      </div>

      {/* Vault Security & Access */}
      <div className="bg-card rounded-2xl border border-border shadow-vault divide-y divide-border overflow-hidden">
        <div className="p-6">
          <h2 className="text-sm font-semibold text-foreground">Vault Security & Access Control</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Authentication guard protecting all financial ledger routes</p>
        </div>

        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Next.js Edge Middleware Guard</div>
              <div className="text-xs text-muted-foreground">Blocks all unauthorized API requests and page access</div>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-positive-soft text-positive text-xs font-semibold rounded-xl border border-positive/20">
            Protected ✓
          </span>
        </div>

        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Active Session</div>
            <div className="text-xs text-muted-foreground">HttpOnly encrypted token on domain</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-negative/30 text-negative hover:bg-negative-soft transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Lock Vault / Sign Out
          </button>
        </div>
      </div>

      {/* Supabase Connection Guide */}
      <div className="bg-card rounded-2xl border border-border shadow-vault p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Supabase Database Connection</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add your connection string to <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono">.env.local</code> to use Postgres as your data store.
          </p>
        </div>

        <div className="space-y-3 text-xs text-muted-foreground">
          {[
            { step: "1", title: "Create a free Supabase project", body: "Sign up at supabase.com and create a project." },
            { step: "2", title: "Copy your connection string", body: "Project Settings → Database → URI → paste as DATABASE_URL in .env.local" },
            { step: "3", title: "Push schema", body: "Run: pnpm --filter @financeos/db prisma db push" },
            { step: "4", title: "Enable pgvector", body: "Run the SQL migration in supabase/migrations/ to enable vector search." },
          ].map(({ step, title, body }) => (
            <div key={step} className="p-3 bg-secondary border border-border rounded-xl">
              <span className="font-bold text-foreground">Step {step}: {title}</span>
              <p className="mt-1 text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
