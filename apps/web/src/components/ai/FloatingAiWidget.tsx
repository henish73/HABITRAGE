'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFinanceStore } from '@/lib/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Wand2,
} from 'lucide-react';
import { ProposedActionCard } from '@/components/copilot/ProposedActionCard';

export function FloatingAiWidget() {
  const { isAiDrawerOpen, closeAiDrawer, toggleAiDrawer } = useFinanceStore();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch initial chat history
  const { data: historyData } = useQuery({
    queryKey: ['ai-chat-history'],
    queryFn: async () => {
      const res = await fetch('/api/chat');
      return res.json();
    },
  });

  useEffect(() => {
    if (historyData?.history) {
      setMessages(historyData.history);
    }
  }, [historyData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiDrawerOpen]);

  const chatMutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.message,
            proposedAction: data.proposedAction,
            function_calls: data.functionCalls,
          },
        ]);
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      }
    },
  });

  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || chatMutation.isPending) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    chatMutation.mutate(text);
  };

  const samplePrompts = [
    'How much at Walmart?',
    'Show pending transactions',
    'When is my CIBC Visa due?',
    'Delete duplicate Uber charge',
    'What is my net worth?',
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={toggleAiDrawer}
        title="Open FinanceOS Copilot (⌘K)"
        className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[var(--vault)] text-white font-semibold shadow-xl border border-[var(--line)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
      >
        <Sparkles className="w-4 h-4 text-[var(--teal)] animate-pulse" />
        <span className="text-xs font-semibold tracking-tight text-[var(--vault-ink)]">Copilot</span>
      </button>

      {/* Slide-over Drawer / Sheet */}
      {isAiDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[var(--surface)] h-full border-l border-[var(--line)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 px-6 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
                    FinanceOS Copilot
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal)]">
                      Asks before changing
                    </span>
                  </h3>
                  <p className="text-[11px] text-[var(--muted-color)]">
                    Autonomous ledger copilot with proposed action previews
                  </p>
                </div>
              </div>
              <button
                onClick={closeAiDrawer}
                className="p-1.5 rounded-xl hover:bg-[var(--raised)] text-[var(--muted-color)] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-6 py-2.5 bg-[var(--raised)] border-b border-[var(--line)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p)}
                  className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] transition-all cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-2 text-[var(--muted-color)]">
                  <Sparkles className="w-8 h-8 text-[var(--teal)] mx-auto opacity-70" />
                  <p className="font-semibold text-xs text-[var(--ink)]">How can I help with your ledger?</p>
                  <p className="text-[11px] max-w-xs mx-auto">
                    Search transactions, simulate debt payoffs, identify refunds, or add upcoming bills.
                  </p>
                </div>
              )}

              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl ${
                        isUser
                          ? 'bg-[var(--ink)] text-[var(--canvas)] rounded-tr-none'
                          : 'bg-[var(--raised)] text-[var(--ink)] border border-[var(--line)] rounded-tl-none leading-relaxed'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>

                      {/* Display Proposed Action Card if AI proposed modifying ledger */}
                      {m.proposedAction && m.proposedAction.transactionId && (
                        <ProposedActionCard
                          type="delete"
                          merchant={m.proposedAction.merchant}
                          date={m.proposedAction.date}
                          amount={m.proposedAction.amount}
                          accountName={m.proposedAction.accountName}
                          balanceBefore={m.proposedAction.balanceBefore}
                          balanceAfter={m.proposedAction.balanceAfter}
                          transactionId={m.proposedAction.transactionId}
                          accountId={m.proposedAction.accountId}
                          category={m.proposedAction.category}
                          onConfirm={async () => {
                            const res = await fetch(`/api/transactions/${m.proposedAction.transactionId}`, { method: 'DELETE' });
                            if (!res.ok) {
                              throw new Error('Failed to delete transaction');
                            }
                            queryClient.invalidateQueries({ queryKey: ['transactions'] });
                            queryClient.invalidateQueries({ queryKey: ['accounts'] });
                            queryClient.invalidateQueries({ queryKey: ['forecast'] });
                          }}
                          onCancel={() => {}}
                        />
                      )}

                      {/* Function Call Indicator */}
                      {m.function_calls && m.function_calls.length > 0 && (
                        <div className="pt-2 border-t border-[var(--line)] mt-2 space-y-1">
                          {m.function_calls.map((fc: any, fidx: number) => (
                            <div
                              key={fidx}
                              className="text-[10px] font-mono text-[var(--teal)] bg-[var(--teal-soft)] px-2 py-0.5 rounded flex items-center gap-1.5"
                            >
                              <Wand2 className="w-3 h-3" />
                              <span>Tool: {fc.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-[var(--raised)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center shrink-0 mt-0.5 font-semibold text-[10px]">
                        FO
                      </div>
                    )}
                  </div>
                );
              })}

              {chatMutation.isPending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-[var(--raised)] border border-[var(--line)] rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 text-[var(--muted-color)] text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--teal)]" />
                    <span>Analyzing ledger and calculating balance impact…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-[var(--line)] bg-[var(--surface)]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask or command: e.g. 'Remove duplicate Uber charge'…"
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-[var(--raised)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--faint)] focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || chatMutation.isPending}
                  className="p-2.5 rounded-xl bg-[var(--ink)] text-[var(--canvas)] hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
