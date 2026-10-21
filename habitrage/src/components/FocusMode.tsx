import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  Coffee,
  Brain,
  MessageSquare,
  Save,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Task, JournalEntry } from '../types';

interface FocusModeProps {
  userId: string;
  activeTask?: Task;
  onClose: () => void;
}

export const FocusMode: React.FC<FocusModeProps> = ({ userId, activeTask, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [scratchpad, setScratchpad] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      handleCycleComplete();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleCycleComplete = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
    
    if (mode === 'focus') {
      setMode('break');
      setTimeLeft(5 * 60);
    } else {
      setMode('focus');
      setTimeLeft(25 * 60);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const completeTask = async () => {
    if (!activeTask || !userId) return;
    try {
      await updateDoc(doc(db, `users/${userId}/tasks/${activeTask.taskId}`), {
        status: 'completed'
      });
      onClose();
    } catch (err) {
      console.error("Complete task failed:", err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveScratchpad = async () => {
    if (!scratchpad.trim()) return;
    setIsSaving(true);
    try {
      const entry: JournalEntry = {
        entryId: crypto.randomUUID(),
        text: `[FOCUS SCRATCHPAD - ${activeTask?.title || 'General'}]\n\n${scratchpad}`,
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, `users/${userId}/journal_entries`), entry);
      setScratchpad('');
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-[#2D3748] flex flex-col items-center justify-center p-8 lg:p-24 overflow-hidden"
    >
      <button 
        onClick={onClose}
        className="absolute top-12 right-12 p-4 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
        {/* Timer Column */}
        <div className="flex flex-col items-center space-y-12">
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-white/60 text-xs font-bold uppercase tracking-widest">
              {mode === 'focus' ? <Brain className="w-3 h-3 text-[#2D34FB]" /> : <Coffee className="w-3 h-3 text-green-400" />}
              {mode === 'focus' ? 'Deep Work Cycle' : 'Restoration Phase'}
            </div>
            <h2 className="text-white text-9xl font-lexend font-bold tracking-tighter">
              {formatTime(timeLeft)}
            </h2>
            {activeTask && (
              <p className="text-white/60 font-medium text-lg">
                Working on: <span className="text-white font-bold">{activeTask.title}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={resetTimer}
              className="p-6 bg-white/5 text-white rounded-3xl hover:bg-white/10 transition-all"
            >
              <RotateCcw className="w-8 h-8" />
            </button>
            <button 
              onClick={toggleTimer}
              className="w-24 h-24 bg-[#2D34FB] text-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-[#2D34FB]/40 hover:scale-105 active:scale-95 transition-all"
            >
              {isActive ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
            </button>
            <button 
              onClick={completeTask}
              className="p-6 bg-white/5 text-white rounded-3xl hover:bg-white/10 transition-all"
              title="Mark Task as Completed"
            >
              <CheckCircle2 className="w-8 h-8" />
            </button>
          </div>
        </div>

        {/* Scratchpad Column */}
        <div className="bg-white/5 rounded-[48px] p-12 border border-white/10 flex flex-col h-[600px] space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-white font-lexend font-bold text-xl">Cognitive Scratchpad</h3>
            </div>
            <button 
              onClick={saveScratchpad}
              disabled={isSaving || !scratchpad.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D34FB]/20 text-[#2D34FB] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#2D34FB]/30 transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Sync Note
            </button>
          </div>

          <textarea 
            value={scratchpad}
            onChange={(e) => setScratchpad(e.target.value)}
            placeholder="Stream of consciousness..."
            className="flex-1 bg-transparent border-none text-white font-medium text-lg focus:outline-none resize-none placeholder:text-white/10 scrollbar-hide"
          />

          <div className="pt-8 border-t border-white/10 flex items-center justify-between">
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
              Isolation Active • Biometric Guard Engaged
            </p>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-[#2D34FB]" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
