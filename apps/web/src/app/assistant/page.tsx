"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  User,
  Send,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Terminal,
  ArrowUpRight,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  X,
  CreditCard,
  DollarSign,
  Receipt,
  Search,
  PieChart
} from "lucide-react";
import { formatCAD } from "@financeos/shared";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  function_calls?: any[];
  created_at?: string;
}

const CATEGORIZED_PROMPTS = [
  { label: "Accounts Balance", query: "What is my total balance across all accounts and what are my recent transactions?", icon: DollarSign },
  { label: "Walmart Spending", query: "How much did I spend at Walmart in total?", icon: Search },
  { label: "Top Categories", query: "What are my highest spending categories?", icon: PieChart },
  { label: "Recurring Bills", query: "List all my recurring bills and their upcoming due dates", icon: Receipt },
  { label: "Credit Scores", query: "What is my credit score from Equifax and TransUnion?", icon: CreditCard },
  { label: "Add Bill", query: "Add a recurring bill named Disney+ for $14.99 CAD due on the 15th monthly linked to CIBC", icon: Sparkles },
];

/**
 * Rich message renderer supporting markdown tables, lists, bold text, and currency highlighting.
 */
function FormattedMessage({ content }: { content: string }) {
  if (!content) return null;

  // Split into paragraphs / blocks
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let tableRows: string[] = [];
  let inTable = false;

  const flushTable = (key: number) => {
    if (tableRows.length === 0) return null;
    const headerRow = tableRows[0];
    const dataRows = tableRows.slice(2); // skip separator row (index 1)

    const parseCells = (row: string) =>
      row
        .split("|")
        .map((c) => c.trim())
        .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

    const headers = parseCells(headerRow);

    const tableEl = (
      <div key={`table-${key}`} className="my-3 overflow-x-auto rounded-xl border border-border shadow-2xs">
        <table className="w-full text-xs text-left text-foreground">
          <thead className="bg-secondary/80 text-foreground uppercase font-semibold text-[10px] tracking-wider border-b border-border">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {dataRows.map((dr, rowIdx) => {
              const cells = parseCells(dr);
              return (
                <tr key={rowIdx} className={rowIdx % 2 === 1 ? "bg-secondary/50" : ""}>
                  {cells.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-3 py-2 font-medium">
                      {renderInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
    return tableEl;
  };

  const renderInlineFormatting = (text: string) => {
    // Process bold (**text**)
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const inner = part.slice(2, -2);
        // Highlight CAD amounts
        if (inner.includes("$") || inner.toLowerCase().includes("cad")) {
          return (
            <span
              key={idx}
              className="font-bold text-foreground bg-positive/10 text-positive px-1 py-0.5 rounded border border-positive/50"
            >
              {inner}
            </span>
          );
        }
        return (
          <strong key={idx} className="font-semibold text-foreground">
            {inner}
          </strong>
        );
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect markdown table line
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      inTable = true;
      tableRows.push(line.trim());
      continue;
    } else if (inTable) {
      const tbl = flushTable(i);
      if (tbl) elements.push(tbl);
    }

    // Unordered list item
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
      const itemText = line.trim().replace(/^[\*\-•]\s+/, "");
      elements.push(
        <div key={i} className="flex items-start gap-2 my-1 text-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mt-2 shrink-0" />
          <div className="flex-1">{renderInlineFormatting(itemText)}</div>
        </div>
      );
      continue;
    }

    // Numbered list item
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2 my-1 text-foreground">
          <span className="font-bold text-xs text-muted-foreground w-4 text-right shrink-0">{numMatch[1]}.</span>
          <div className="flex-1">{renderInlineFormatting(numMatch[2])}</div>
        </div>
      );
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="font-bold text-foreground mt-3 mb-1 text-sm">
          {line.replace(/^###\s+/, "")}
        </h4>
      );
      continue;
    }

    // Regular line
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="my-0.5 leading-relaxed">
          {renderInlineFormatting(line)}
        </p>
      );
    }
  }

  if (inTable) {
    const tbl = flushTable(lines.length);
    if (tbl) elements.push(tbl);
  }

  return <div>{elements}</div>;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [showClearModal, setShowClearModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from server on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/chat");
        const data = await res.json();
        if (data.success && Array.isArray(data.history) && data.history.length > 0) {
          setMessages(data.history);
        } else {
          // Default intro if no history
          setMessages([
            {
              id: "intro-1",
              role: "assistant",
              content:
                "Hello! I am FinanceOS AI — your personal financial copilot powered by Gemini 2.5 Flash.\n\nI have autonomous function calling access to all 4,159 transactions across your CIBC, TD, RBC, AMEX, and Rogers accounts.\n\nI can search your ledger, create and schedule bills, query real-time balances, analyze categorical spending, and add or delete transactions. How can I assist you today?"
            }
          ]);
        }
      } catch (err) {
        console.error("Failed to load AI chat history:", err);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: "u-" + Date.now(),
      role: "user",
      content: text
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await res.json();
      if (data.success) {
        const assistantMsg: Message = {
          id: "a-" + Date.now(),
          role: "assistant",
          content: data.reply || data.message || "Done.",
          function_calls: data.functionCalls || data.function_calls || []
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || "Execution failed");
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: `Sorry, I encountered an issue: ${err.message || "Could not complete request"}. Please verify your network connection and try again.`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await fetch("/api/chat", { method: "DELETE" });
      setMessages([
        {
          id: "intro-reset-" + Date.now(),
          role: "assistant",
          content: "Conversation history cleared. How can I help you today?"
        }
      ]);
    } catch (err) {
      console.error("Failed to clear chat history:", err);
    } finally {
      setShowClearModal(false);
    }
  };

  const toggleToolExpand = (msgId: string) => {
    setExpandedTools((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-5xl mx-auto bg-card rounded-2xl border border-border shadow-vault overflow-hidden">
      {/* Header */}
      <div className="p-4 px-6 border-b border-border flex items-center justify-between bg-secondary/40 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">AI Copilot</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-positive-soft text-positive border border-positive/20">
                <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Query your ledger in natural language
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowClearModal(true)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-secondary transition border border-transparent hover:border-border"
          title="Clear Chat History"
        >
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background/40">
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Bot className="w-8 h-8 animate-pulse" />
            <p className="text-xs font-medium">Loading conversation history...</p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs relative group ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-card text-foreground border border-border rounded-bl-none"
                }`}
              >
                {/* Assistant Function Calling execution trace badges */}
                {m.role === "assistant" && m.function_calls && m.function_calls.length > 0 && (
                  <div className="mb-3 space-y-1.5 pb-2.5 border-b border-border">
                    <button
                      type="button"
                      onClick={() => toggleToolExpand(m.id)}
                      className="text-[11px] font-bold text-muted-foreground flex items-center justify-between w-full hover:text-foreground transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-accent" />
                        <span>
                          {m.function_calls.length} Database {m.function_calls.length === 1 ? "Tool" : "Tools"} Executed
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-normal">
                        <span>{expandedTools[m.id] ? "Hide details" : "Show details"}</span>
                        {expandedTools[m.id] ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </div>
                    </button>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.function_calls.map((fc, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent border border-accent/60 rounded-md text-[10px] font-mono font-medium"
                        >
                          <CheckCircle2 className="w-3 h-3 text-positive" />
                          {fc.name}
                        </span>
                      ))}
                    </div>

                    {expandedTools[m.id] && (
                      <div className="mt-2 space-y-2 pt-2 border-t border-border font-mono text-[10px]">
                        {m.function_calls.map((fc, i) => (
                          <div key={i} className="p-2 bg-secondary rounded-lg border border-border text-foreground overflow-x-auto">
                            <div className="font-bold text-accent flex items-center justify-between">
                              <span>Function: {fc.name}</span>
                            </div>
                            <div className="text-muted-foreground mt-1">Args: {JSON.stringify(fc.args)}</div>
                            {fc.result && (
                              <div className="text-muted-foreground mt-1">
                                Result: {JSON.stringify(fc.result).slice(0, 200)}
                                {JSON.stringify(fc.result).length > 200 ? "..." : ""}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Formatted Message Body */}
                {m.role === "user" ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <FormattedMessage content={m.content} />
                )}

                {/* Copy to clipboard button for assistant messages */}
                {m.role === "assistant" && (
                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-end">
                    <button
                      onClick={() => handleCopy(m.content, m.id)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-0.5 rounded hover:bg-secondary transition"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="w-3 h-3 text-positive" />
                          <span className="text-positive font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {m.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3 items-center text-muted-foreground text-xs pl-2 bg-secondary p-3 rounded-xl border border-border w-fit animate-pulse">
            <Bot className="w-4 h-4 text-accent" />
            <span className="font-medium">Querying your ledger…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-6 py-2.5 border-t border-border flex items-center gap-2 overflow-x-auto no-scrollbar bg-secondary/30">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">Try:</span>
        {CATEGORIZED_PROMPTS.map((p, idx) => {
          const Icon = p.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSend(p.query)}
              disabled={loading}
              className="shrink-0 px-2.5 py-1.5 bg-card hover:bg-secondary border border-border rounded-lg text-xs text-foreground transition flex items-center gap-1.5 shadow-vault hover:border-accent/30 disabled:opacity-50"
            >
              <Icon className="w-3 h-3 text-muted-foreground" />
              <span>{p.label}</span>
              <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-4 border-t border-border flex items-center gap-3 bg-card"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your finances…"
          className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 bg-accent hover:bg-accent/90 disabled:opacity-40 text-accent-foreground rounded-xl shadow-xs transition shrink-0 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Shneiderman Rule 6: Accessible Confirmation Modal for Clear History */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border shadow-vault-popover max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning-soft text-warning border border-warning/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground">Clear Conversation History?</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  This will clear all messages. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary rounded-xl border border-border transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-3.5 py-2 text-xs font-semibold text-negative-foreground bg-negative hover:bg-negative/90 rounded-xl shadow-xs transition"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
