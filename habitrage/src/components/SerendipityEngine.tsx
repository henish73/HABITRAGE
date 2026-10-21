import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Volume2, 
  RefreshCw, 
  History, 
  ArrowRight,
  BookOpen,
  Palette,
  Play,
  Pause,
  Clock,
  Zap,
  TrendingUp,
  DollarSign,
  Bed
} from 'lucide-react';
import { AppState, JournalEntry, Canvas } from '../types';

interface SerendipityEngineProps {
  state: AppState;
}

export const SerendipityEngine: React.FC<SerendipityEngineProps> = ({ state }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // 1. Serendipity Logic: Surface entries 30-180 days old
  const serendipityItems = useMemo(() => {
    const now = new Date();
    const minDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const oldEntries = state.journalEntries.filter(e => {
      const d = new Date(e.timestamp);
      return d >= minDate && d <= maxDate;
    });

    const oldCanvases = state.canvases.filter(c => {
      const d = new Date(c.lastUpdated);
      return d >= minDate && d <= maxDate;
    });

    return [...oldEntries.map(e => ({ type: 'journal', data: e })), ...oldCanvases.map(c => ({ type: 'canvas', data: c }))]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
  }, [state.journalEntries, state.canvases]);

  // 2. Audio Briefing Logic
  const generateBriefingText = () => {
    const latestHealth = state.healthLogs[0];
    const todayShifts = state.shifts.filter(s => new Date(s.shiftDate).toDateString() === new Date().toDateString());
    const totalEarnings = todayShifts.reduce((acc, s) => acc + s.netEstimatedPay, 0);

    let text = `Habitrage Executive Briefing for today. `;
    if (latestHealth) {
      text += `Your sleep score was ${latestHealth.recoveryScore || 'stable'}. `;
    }
    if (todayShifts.length > 0) {
      text += `You have ${todayShifts.length} shifts scheduled, with a projected yield of ${totalEarnings.toFixed(2)} dollars. `;
    } else {
      text += `No shifts scheduled for today. Focus on deep work ideation. `;
    }
    
    const highUtilization = state.accounts.find(a => a.creditLimit && (a.principalBalance / a.creditLimit) > 0.3);
    if (highUtilization) {
      text += `Warning: ${highUtilization.name} utilization is high. Consider a debt reduction allocation. `;
    }

    return text;
  };

  const handleSpeak = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(generateBriefingText());
    utterance.onend = () => setIsPlaying(false);
    utterance.pitch = 0.9;
    utterance.rate = 1.0;
    
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-8">
      {/* Audio Briefing Widget */}
      <div className="bg-[#2D3748] rounded-[32px] p-8 text-white relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-lexend font-bold flex items-center gap-3">
              <Volume2 className="w-6 h-6 text-[#2D34FB]" />
              Executive Audio Briefing
            </h3>
            <p className="text-white/60 text-sm font-medium">Daily telemetry summary & mission objectives.</p>
          </div>
          <button 
            onClick={handleSpeak}
            className="w-16 h-16 bg-[#2D34FB] rounded-2xl flex items-center justify-center shadow-xl shadow-[#2D34FB]/20 hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#2D34FB]/20 to-transparent -mr-8 -mt-8 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
      </div>

      {/* Serendipity Mesh */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2D34FB]/5 rounded-xl flex items-center justify-center text-[#2D34FB]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-lexend font-bold text-[#2D3748]">Serendipity Mesh</h3>
          </div>
          <button className="text-[10px] font-bold text-[#718096] uppercase tracking-widest flex items-center gap-2 hover:text-[#2D34FB]">
            <RefreshCw className="w-3 h-3" />
            Reshuffle Ideas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {serendipityItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border border-[#E2E8F0] rounded-3xl p-6 space-y-4 group hover:border-[#2D34FB]/30 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 bg-[#F9F7F2] rounded-lg flex items-center justify-center text-[#2D34FB]">
                  {item.type === 'journal' ? <BookOpen className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
                </div>
                <span className="text-[8px] font-bold text-[#718096] uppercase tracking-widest">
                  {new Date((item.data as any).timestamp || (item.data as any).lastUpdated).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-[#718096] font-medium leading-relaxed group-hover:text-[#2D3748] transition-colors line-clamp-3">
                {item.type === 'journal' ? (item.data as JournalEntry).text : (item.data as Canvas).title}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#2D34FB] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Resurface node
                <ArrowRight className="w-3 h-3" />
              </div>
            </motion.div>
          ))}
          {serendipityItems.length === 0 && (
            <div className="col-span-full h-32 border-2 border-dashed border-[#E2E8F0] rounded-3xl flex items-center justify-center text-[#718096] text-xs font-bold uppercase tracking-widest opacity-40">
              Generating serendipity...
            </div>
          )}
        </div>
      </div>

      {/* Circadian Scheduler Stats (Visual only for now) */}
      <div className="bg-[#F9F7F2] border border-[#E2E8F0] rounded-[32px] p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-orange-500" />
            <h4 className="font-lexend font-bold text-[#2D3748]">Circadian Rhythm Logic</h4>
          </div>
          <div className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
            Optimized
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 h-24 items-end">
          {[0.2, 0.4, 0.9, 0.8, 0.3, 0.5, 0.7, 0.1].map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div 
                className={`w-full rounded-t-lg transition-all ${h > 0.7 ? 'bg-orange-500' : 'bg-[#E2E8F0]'}`} 
                style={{ height: `${h * 100}%` }}
              />
              <span className="text-[8px] text-[#718096] font-bold">{i * 3}h</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#718096] font-medium">
          Historical peak energy detected at <span className="text-[#2D3748] font-bold">09:00 - 11:00</span>. Deep work tasks automatically scheduled for these windows.
        </p>
      </div>
    </div>
  );
};
