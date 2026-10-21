"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Upload, AlertCircle, FileText, CheckCircle2, ChevronRight, TrendingUp, AlertTriangle } from "lucide-react";
import { formatCAD } from "@financeos/shared";

interface CreditReport {
  id: string;
  bureau: string;
  score: number;
  utilization_percent: number;
  total_debt: number;
  open_accounts: any[];
  closed_accounts: any[];
  inquiries: any[];
  derogatories: any[];
  file_name: string;
  uploaded_at: string;
}

export default function CreditReportsPage() {
  const [reports, setReports] = useState<CreditReport[]>([]);
  const [activeReport, setActiveReport] = useState<CreditReport | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "accounts" | "inquiries" | "report">("overview");
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetch("/api/credit-reports")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setReports(data);
          setActiveReport(data[0]);
        }
      })
      .catch(console.error);
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      // In production, we extract text via pdf.js client-side and send to Gemini API
      // Here we simulate parsing and create an updated report entry
      const newReport: Partial<CreditReport> = {
        bureau: file.name.toLowerCase().includes("transunion") ? "TransUnion" : "Equifax",
        score: Math.floor(740 + Math.random() * 40),
        utilization_percent: 18.5,
        total_debt: 12500,
        file_name: file.name,
        uploaded_at: new Date().toISOString(),
        open_accounts: [
          { name: "CIBC Dividend Visa", balance: 1420.50, limit: 3500, status: "R1 - Paid as Agreed" },
          { name: "TD Low Rate Visa", balance: 340.00, limit: 1000, status: "R1 - Paid as Agreed" },
          { name: "Rogers Mastercard", balance: 110.20, limit: 500, status: "R1 - Paid as Agreed" },
          { name: "AMEX Simply Cash", balance: 250.00, limit: 1100, status: "R1 - Paid as Agreed" }
        ],
        closed_accounts: [
          { name: "Student Loan - NSLSC", closed_date: "2024-05-15", status: "Paid in Full" }
        ],
        inquiries: [
          { date: "2024-08-10", creditor: "Rogers Communications", type: "Hard" },
          { date: "2024-01-15", creditor: "CIBC Mortgages", type: "Soft" }
        ],
        derogatories: []
      };

      const res = await fetch("/api/credit-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReport)
      });
      const created = await res.json();
      setReports((prev) => [created, ...prev]);
      setActiveReport(created);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 760) return "text-positive bg-positive/10 border-positive/25";
    if (score >= 700) return "text-accent bg-accent/10 border-accent/25";
    if (score >= 650) return "text-warning bg-warning/10 border-warning/25";
    return "text-negative bg-negative/10 border-negative/25";
  };

  const getScoreRating = (score: number) => {
    if (score >= 760) return "Excellent";
    if (score >= 700) return "Good";
    if (score >= 650) return "Fair";
    return "Needs Improvement";
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Credit Report Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Secure, client-side parsed credit files from Equifax, TransUnion, and Borrowell
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium shadow-vault transition">
            <Upload className="w-4 h-4" />
            <span>{isUploading ? "Parsing PDF with AI..." : "Upload Credit PDF"}</span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* Main Report View */}
      {activeReport ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Score Gauge & Key Metrics */}
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-2xl border border-border shadow-vault flex flex-col items-center text-center">
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                {activeReport.bureau} Credit Score
              </span>
              
              {/* Score Gauge Ring Visual */}
              <div className="relative w-44 h-44 flex items-center justify-center my-3">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={activeReport.score >= 740 ? "hsl(var(--positive))" : "hsl(var(--accent))"}
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - ((activeReport.score - 300) / 600) * 251.2}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-extrabold text-foreground tracking-tight">
                    {activeReport.score}
                  </span>
                  <span className="text-xs font-semibold text-positive mt-0.5">
                    {getScoreRating(activeReport.score)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Range: 300 – 900</span>
                <span>•</span>
                <span>Updated {new Date(activeReport.uploaded_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-vault space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Credit Health Factors</h3>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Credit Utilization</span>
                  <span className="font-semibold text-foreground">{activeReport.utilization_percent}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      activeReport.utilization_percent < 30 ? "bg-positive" : "bg-warning"
                    }`}
                    style={{ width: `${Math.min(activeReport.utilization_percent, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Target is below 30% for optimal score.</p>
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Revolving Debt</span>
                <span className="text-sm font-bold text-foreground">{formatCAD(activeReport.total_debt)}</span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Open Accounts</span>
                <span className="text-sm font-bold text-foreground">{activeReport.open_accounts?.length || 0}</span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Inquiries (Last 2 Yrs)</span>
                <span className="text-sm font-bold text-foreground">{activeReport.inquiries?.length || 0}</span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Derogatory Marks</span>
                <span className="text-sm font-bold text-positive">
                  {activeReport.derogatories?.length === 0 ? "0 (Clean Record)" : activeReport.derogatories?.length}
                </span>
              </div>
            </div>

            {/* Uploaded Files History */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-vault">
              <h3 className="text-sm font-semibold text-foreground mb-3">Report History</h3>
              <div className="space-y-2">
                {reports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveReport(r)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      activeReport.id === r.id
                        ? "bg-secondary border-border ring-1 ring-border"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs font-semibold text-foreground">{r.bureau}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(r.uploaded_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-foreground">{r.score}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Tabbed Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              {/* Navigation Tabs */}
              <div className="flex border-b border-border px-6 pt-3">
                {(["overview", "accounts", "inquiries", "report"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition relative ${
                      activeTab === tab
                        ? "text-foreground border-b-2 border-border"
                        : "text-muted-foreground hover:text-muted-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="p-6">
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div className="p-4 bg-positive/10 border border-positive/10 rounded-xl flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-positive shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-positive">Your profile is in great standing</h4>
                        <p className="text-xs text-positive mt-0.5">
                          No late payments or collections reported across CIBC, TD, Rogers, or AMEX. Maintaining your utilization under 20% will help cross the 780 threshold.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Revolving Lines of Credit</h4>
                      <div className="space-y-3">
                        {activeReport.open_accounts?.map((acc: any, i: number) => (
                          <div key={i} className="p-4 border border-border rounded-xl flex items-center justify-between">
                            <div>
                              <div className="text-xs font-bold text-foreground">{acc.name}</div>
                              <div className="text-[11px] text-muted-foreground">Limit: {formatCAD(acc.limit)} • Status: {acc.status}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-foreground">{formatCAD(acc.balance)}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {Math.round((acc.balance / (acc.limit || 1)) * 100)}% utilization
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "accounts" && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">All Registered Trade Lines</h4>
                    <div className="divide-y divide-border">
                      {activeReport.open_accounts?.map((acc: any, idx: number) => (
                        <div key={idx} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-foreground">{acc.name}</div>
                            <div className="text-[11px] text-positive">{acc.status}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-foreground">{formatCAD(acc.balance)}</div>
                            <div className="text-[10px] text-muted-foreground">of {formatCAD(acc.limit)} limit</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "inquiries" && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Credit Bureau Inquiries</h4>
                    <div className="divide-y divide-border">
                      {activeReport.inquiries?.map((inq: any, idx: number) => (
                        <div key={idx} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-foreground">{inq.creditor}</div>
                            <div className="text-[11px] text-muted-foreground">Date: {inq.date}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            inq.type === "Hard" ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground"
                          }`}>
                            {inq.type} Inquiry
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "report" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Parsed Raw AI Text Snapshot</h4>
                      <span className="text-xs text-muted-foreground">{activeReport.file_name}</span>
                    </div>
                    <pre className="p-4 bg-secondary border border-border rounded-xl text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap max-h-96">
                      {JSON.stringify(activeReport, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card p-12 rounded-2xl border border-border text-center shadow-vault">
          <ShieldCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">No Credit Reports Added Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
            Upload your Equifax, TransUnion, or Borrowell PDF to extract scores, inquiries, and debt ratios.
          </p>
        </div>
      )}
    </div>
  );
}
