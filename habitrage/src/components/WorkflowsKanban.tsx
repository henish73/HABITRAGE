import React from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  MoreVertical, 
  Calendar, 
  Zap, 
  Clock, 
  CheckCircle2,
  Circle,
  AlertCircle,
  Palette,
  Copy,
  Trash2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Task } from '../types';

interface WorkflowsKanbanProps {
  userId: string;
  tasks: Task[];
  onAddTask: () => void;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export const WorkflowsKanban: React.FC<WorkflowsKanbanProps> = ({ 
  userId, 
  tasks, 
  onAddTask,
  onSuccess,
  onError 
}) => {
  const columns = [
    { id: 'todo', title: 'Deep Backlog', icon: Circle },
    { id: 'in_progress', title: 'Active Mesh', icon: Zap },
    { id: 'completed', title: 'Resolved', icon: CheckCircle2 }
  ];

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      await updateDoc(doc(db, `users/${userId}/tasks/${taskId}`), { status });
      onSuccess?.("Task status recalibrated.");
    } catch (err) {
      console.error("Failed to update task:", err);
      onError?.("Signal relay failed. Task status unchanged.");
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, `users/${userId}/tasks/${taskId}`));
      onSuccess?.("Signal purged from workflow mesh.");
    } catch (err) {
      console.error("Failed to delete task:", err);
      onError?.("Purge failed. Signal remains in mesh.");
    }
  };

  const energyColors = {
    low: 'bg-[#8DAA91]/10 text-[#8DAA91]',
    medium: 'bg-[#2D34FB]/10 text-[#2D34FB]',
    deep_work: 'bg-[#2D3748]/10 text-[#2D3748]'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full min-h-[700px]">
      {columns.map((col) => (
        <div key={col.id} className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                col.id === 'todo' ? "bg-[#718096]/5 text-[#718096]" : 
                col.id === 'in_progress' ? "bg-[#2D34FB]/5 text-[#2D34FB]" : 
                "bg-[#8DAA91]/5 text-[#8DAA91]"
              )}>
                <col.icon className="w-4 h-4" />
              </div>
              <h3 className="font-lexend font-bold text-[#2D3748]">{col.title}</h3>
              <span className="text-[10px] font-lexend font-bold text-[#718096] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                {tasks.filter(t => t.status === col.id).length}
              </span>
            </div>
            {col.id === 'todo' && (
              <button 
                onClick={onAddTask}
                className="p-1.5 hover:bg-[#2D34FB]/5 text-[#2D34FB] rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 bg-[#F9F7F2]/50 border border-[#E2E8F0] rounded-[32px] p-4 space-y-4">
            {tasks
              .filter(t => t.status === col.id)
              .map((task) => (
                <motion.div
                  key={task.taskId}
                  layoutId={task.taskId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-[#2D34FB]/20 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider",
                      energyColors[task.energyTag || 'medium']
                    )}>
                      {task.energyTag?.replace('_', ' ') || 'Medium'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`[TASK:${task.taskId}]`);
                        }}
                        className="p-1.5 bg-[#F9F7F2] text-[#718096] rounded-md hover:text-[#2D34FB] transition-all"
                        title="Copy Sync ID for Creative Mesh"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => deleteTask(task.taskId)}
                        className="p-1.5 bg-[#F9F7F2] text-[#718096] rounded-md hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  <h4 className="font-lexend font-bold text-[#2D3748] leading-tight mb-4">
                    {task.title}
                  </h4>

                  <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
                    <div className="flex items-center gap-1.5 text-[10px] text-[#718096] font-bold uppercase tracking-widest">
                      <Calendar className="w-3 h-3" />
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Date'}
                      {task.linkedCanvasId && (
                        <div className="flex items-center gap-1 ml-2 text-[#2D34FB]">
                          <Palette className="w-3 h-3" />
                          Ideation
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {col.id !== 'todo' && (
                        <button 
                          onClick={() => updateTaskStatus(task.taskId, col.id === 'completed' ? 'in_progress' : 'todo')}
                          className="p-1 text-[#718096] hover:text-[#2D34FB]"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {col.id !== 'completed' && (
                        <button 
                          onClick={() => updateTaskStatus(task.taskId, col.id === 'todo' ? 'in_progress' : 'completed')}
                          className="p-1 text-[#718096] hover:text-[#8DAA91]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            
            {tasks.filter(t => t.status === col.id).length === 0 && (
              <div className="h-32 flex flex-col items-center justify-center text-[#E2E8F0] border-2 border-dashed border-[#E2E8F0] rounded-2xl">
                <AlertCircle className="w-6 h-6 mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Empty Sector</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
