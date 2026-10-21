import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Calendar, Zap, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Task } from '../types';

interface AddTaskModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ userId, isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [energyTag, setEnergyTag] = useState<Task['energyTag']>('medium');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setLoading(true);
    try {
      const taskId = crypto.randomUUID();
      const taskData: Task = {
        taskId,
        title,
        status: 'todo',
        energyTag,
        dueDate: new Date(dueDate).toISOString(),
        originalDueDate: new Date(dueDate).toISOString(),
        rescheduleCount: 0
      };

      await setDoc(doc(db, `users/${userId}/tasks/${taskId}`), taskData);
      onClose();
      setTitle('');
    } catch (err) {
      console.error("Error adding task:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#2D3748]/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[40px] w-full max-w-lg p-10 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-8 right-8 p-2 text-[#718096] hover:bg-[#F9F7F2] rounded-xl transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-3xl font-lexend font-bold text-[#2D3748]">New Task Mesh</h3>
            <p className="text-[#718096] text-sm font-medium">Provision a new operational node in your workflow.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#2D3748] uppercase tracking-widest">Description</label>
              <input 
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be resolved?"
                className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium focus:outline-none focus:ring-4 focus:ring-[#2D34FB]/10 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#2D3748] uppercase tracking-widest">Energy Load</label>
                <select 
                  value={energyTag}
                  onChange={(e) => setEnergyTag(e.target.value as any)}
                  className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium focus:outline-none focus:ring-4 focus:ring-[#2D34FB]/10 appearance-none"
                >
                  <option value="low">Low Energy</option>
                  <option value="medium">Medium Load</option>
                  <option value="deep_work">Deep Work</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#2D3748] uppercase tracking-widest">Target Date</label>
                <input 
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium focus:outline-none focus:ring-4 focus:ring-[#2D34FB]/10"
                />
              </div>
            </div>

            <button
              disabled={loading || !title}
              className="w-full bg-[#2D34FB] text-white py-5 rounded-2xl font-lexend font-bold text-lg hover:bg-[#1A23D6] transition-all shadow-xl shadow-[#2D34FB]/20 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
              Initialize Task
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
