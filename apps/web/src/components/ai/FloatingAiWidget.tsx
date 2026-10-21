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
  ChevronRight,
  TrendingDown,
  Calendar,
  Trash2,
} from 'lucide-react';

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
    onSuccess: (data, variables) => {
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.message,
            function_calls: data.functionCalls,
          },
        ]);
        // Invalidate queries in case AI did CRUD operations!
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
    'Delete BLUENOTES',
    'Add Rogers $50 due 15th',
    'What is my net worth?',
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={toggleAiDrawer}
        title="Open FinanceOS AI Assistant"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-accent via-accent to-primary text-white font-semibold shadow-xl shadow-accent/30 hover:scale-105 active:scale-95 transition-all duration-200 group"
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
        <span className="text-xs font-bold tracking-tight pr-1">FinanceOS AI</span>
      </button>

      {/* Slide-over Drawer */}
      {isAiDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card h-full border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 px-6 border-b border-border flex items-center justify-between bg-card/70 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent to-primary text-white flex items-center justify-center shadow-md shadow-accent/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    FinanceOS AI Assistant
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-accent/10 text-accent border border-accent/20">
                      Gemini 2.0
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Connected to 4,158 transactions & $CAD ledger</p>
                </div>
              </div>
              <button
                onClick={closeAiDrawer}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-6 py-2.5 bg-muted/40 border-b border-border flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p)}
                  className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-background border border-border hover:border-primary/40 hover:text-primary transition-all"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 ${
                        isUser
                          ? 'bg-primary text-primary-foreground font-medium rounded-tr-none'
                          : 'bg-muted/70 text-foreground border border-border rounded-tl-none leading-relaxed'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>

                      {/* Display Function Call Indicator if executed */}
                      {m.function_calls && m.function_calls.length > 0 && (
                        <div className="pt-2 border-t border-border/40 mt-2 space-y-1">
                          {m.function_calls.map((fc: any, fidx: number) => (
                            <div
                              key={fidx}
                              className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded flex items-center gap-1.5"
                            >
                              <Wand2 className="w-3 h-3" />
                              <span>Tool executed: {fc.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {chatMutation.isPending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-muted/70 border border-border rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 text-muted-foreground text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                    <span>Analyzing ledger and executing tools...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-border bg-card/60 backdrop-blur-md">
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
                  placeholder="Ask or command: e.g. 'Add rent 1900 due 1st'..."
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-muted/60 border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || chatMutation.isPending}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/25"
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
