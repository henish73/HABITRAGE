import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PenLine, 
  Sparkles, 
  History, 
  Smile, 
  Meh, 
  Frown,
  CheckCircle2,
  Loader2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { JournalEntry, Task } from '../types';

interface JournalEngineProps {
  userId: string;
  entries: JournalEntry[];
  openRouterKey: string;
}

export const JournalEngine: React.FC<JournalEngineProps> = ({ userId, entries, openRouterKey }) => {
  const [reflection, setReflection] = useState('');
  const [isDistilling, setIsDistilling] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const distillReflection = async () => {
    if (!reflection || !userId) return;

    if (!openRouterKey) {
      setError("Please configure your OpenRouter API key in settings.");
      return;
    }

    setIsDistilling(true);
    setError(null);
    try {
      const response = await fetch('/api/distill-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reflection, openRouterKey })
      });

      if (!response.ok) throw new Error('Distillation failed');
      const data = await response.json();

      const entryId = crypto.randomUUID();
      const entry: JournalEntry = {
        entryId,
        text: reflection,
        sentimentScore: data.sentimentScore,
        extractedActionItems: data.extractedActionItems,
        timestamp: new Date().toISOString()
      };

      await setDoc(doc(db, `users/${userId}/journal_entries/${entryId}`), entry);

      // Add action items to task mesh
      if (data.extractedActionItems?.length) {
        for (const item of data.extractedActionItems) {
          const taskId = crypto.randomUUID();
          const task: Task = {
            taskId,
            title: item,
            status: 'todo',
            energyTag: 'medium',
            dueDate: new Date().toISOString(),
            originalDueDate: new Date().toISOString(),
            rescheduleCount: 0
          };
          await setDoc(doc(db, `users/${userId}/tasks/${taskId}`), task);
        }
      }

      setReflection('');
      setShowHistory(true);
    } catch (err) {
      console.error("Distillation error:", err);
    } finally {
      setIsDistilling(false);
    }
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.3) return <Smile className="w-4 h-4 text-green-500" />;
    if (score < -0.3) return <Frown className="w-4 h-4 text-red-500" />;
    return <Meh className="w-4 h-4 text-[#718096]" />;
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-lexend font-bold text-[#2D3748]">Journal Mesh</h2>
          <p className="text-[#718096] font-medium">Cognitive distillation & sentiment tracking.</p>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-6 py-3 bg-[#F9F7F2] text-[#2D3748] rounded-2xl font-lexend font-bold text-sm hover:bg-[#E2E8F0] transition-all"
        >
          {showHistory ? <PenLine className="w-4 h-4" /> : <History className="w-4 h-4" />}
          {showHistory ? 'New Reflection' : 'Reflection Vault'}
        </button>
      </header>

      <AnimatePresence mode="wait">
        {!showHistory ? (
          <motion.div
            key="composer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="bg-white border border-[#E2E8F0] rounded-[40px] p-10 shadow-2xl shadow-black/5 relative overflow-hidden">
              <textarea 
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="What's currently occupying your cognitive bandwidth?"
                className="w-full h-64 bg-transparent border-none resize-none font-lexend text-xl text-[#2D3748] placeholder:text-[#E2E8F0] focus:outline-none"
              />
              <div className="absolute bottom-10 right-10">
                <button 
                  disabled={!reflection || isDistilling}
                  onClick={distillReflection}
                  className="bg-[#2D34FB] text-white px-8 py-4 rounded-2xl font-lexend font-bold flex items-center gap-2 hover:bg-[#1A23D6] transition-all shadow-xl shadow-[#2D34FB]/20 disabled:opacity-50"
                >
                  {isDistilling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {isDistilling ? 'Distilling...' : 'Distill Reflection'}
                </button>
              </div>
              {error && (
                <div className="absolute bottom-10 left-10 p-4 bg-red-50 rounded-xl flex items-center gap-3 text-red-600 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-[#718096] font-bold uppercase tracking-widest px-4">
              <Sparkles className="w-3 h-3 text-[#2D34FB]" />
              AI will automatically extract tasks and analyze sentiment
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {entries.map((entry) => (
              <div key={entry.entryId} className="bg-white border border-[#E2E8F0] rounded-[32px] p-8 shadow-lg shadow-black/5 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#F9F7F2] rounded-lg">
                      <Calendar className="w-4 h-4 text-[#718096]" />
                    </div>
                    <span className="text-sm font-bold text-[#2D3748]">
                      {new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-[#F9F7F2] rounded-full">
                    {getSentimentIcon(entry.sentimentScore || 0)}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#718096]">
                      {entry.sentimentScore ? Math.round(entry.sentimentScore * 100) : 0}
                    </span>
                  </div>
                </div>
                
                <p className="text-[#2D3748] leading-relaxed italic">"{entry.text}"</p>

                {entry.extractedActionItems && entry.extractedActionItems.length > 0 && (
                  <div className="pt-6 border-t border-[#F1F5F9] space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#718096]">Extracted Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {entry.extractedActionItems.map((item, i) => (
                        <span key={i} className="px-3 py-1 bg-[#2D34FB]/5 text-[#2D34FB] rounded-lg text-xs font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3" />
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {entries.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-[#E2E8F0]">
                <PenLine className="w-12 h-12 mb-4" />
                <p className="font-lexend font-bold">No reflections distilled yet.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
