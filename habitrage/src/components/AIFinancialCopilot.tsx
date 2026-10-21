import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Send, 
  X, 
  ChevronDown, 
  Sparkles,
  RefreshCcw,
  MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Transaction, Account } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIFinancialCopilotProps {
  transactions: Transaction[];
  accounts: Account[];
}

export const AIFinancialCopilot: React.FC<AIFinancialCopilotProps> = ({ transactions, accounts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "Hello! I'm your AI Financial Copilot. I can help you analyze your spending, categorize transactions, or find trends in your cash flow. How can I assist you today?" 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const context = {
        transactionCount: transactions.length,
        accountCount: accounts.length,
        recentTransactions: transactions.slice(0, 50).map(t => ({
          amount: t.amount,
          merchant: t.merchant,
          category: t.category,
          type: t.type,
          date: t.timestamp
        })),
        accounts: accounts.map(a => {
          const start = a.startingBalance || 0;
          const activity = transactions
            .filter(t => t.accountId === a.accountId)
            .reduce((sum, t) => t.type === 'income' ? sum + t.amount : t.type === 'expense' ? sum - t.amount : sum, 0);
          return {
            name: a.name,
            institution: a.institution,
            type: a.type,
            balance: start + activity
          };
        })
      };

      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context })
      });

      if (!response.ok) throw new Error('Failed to reach Copilot');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#2D34FB] text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:bg-[#1a20e0] transition-colors"
      >
        <Bot className="w-8 h-8" />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"
        />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-28 right-8 w-[450px] max-w-[calc(100vw-64px)] h-[650px] max-h-[calc(100vh-140px)] bg-white rounded-[32px] shadow-2xl flex flex-col z-50 border border-[#E2E8F0] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-[#F9F7F2] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2D34FB] rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-lexend font-bold text-[#2D3748]">Financial Copilot</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-[#718096] uppercase tracking-widest">System Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setMessages([{ role: 'assistant', content: "Mesh cleared. How can I assist with your capital analysis now?" }])}
                  className="p-2 hover:bg-[#E2E8F0] rounded-lg text-[#718096] transition-colors"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-[#E2E8F0] rounded-lg text-[#718096] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 bg-white custom-scrollbar"
            >
              {messages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-[#2D34FB] text-white rounded-tr-none' 
                        : 'bg-[#F9F7F2] text-[#2D3748] rounded-tl-none border border-[#E2E8F0]'
                    }`}>
                      <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-[#718096] uppercase tracking-widest px-1">
                      {msg.role === 'user' ? 'You' : 'Copilot'}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#F9F7F2] border border-[#E2E8F0] p-4 rounded-2xl rounded-tl-none flex gap-1">
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 bg-[#2D34FB] rounded-full" />
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#2D34FB] rounded-full" />
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#2D34FB] rounded-full" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 bg-white border-t border-[#E2E8F0]">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask your Copilot anything..."
                  className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl pl-6 pr-14 py-4 font-medium text-[#2D3748] focus:outline-none focus:border-[#2D34FB]/30 transition-all placeholder:text-[#A0AEC0]"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-3 bg-[#2D34FB] text-white rounded-xl hover:bg-[#1a20e0] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-[9px] text-center text-[#A0AEC0] font-bold uppercase tracking-[0.2em]">
                Mesh Intelligence powered by Gemini
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
