import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Palette, 
  Save, 
  Trash2, 
  Plus, 
  ChevronLeft,
  Loader2,
  Layout
} from 'lucide-react';
import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Canvas, Task } from '../types';

interface CreativeMeshProps {
  userId: string;
  canvases: Canvas[];
  tasks: Task[];
}

export const CreativeMesh: React.FC<CreativeMeshProps> = ({ userId, canvases, tasks }) => {
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [title, setTitle] = useState('New Ideation');
  const [isSaving, setIsSaving] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeCanvas = canvases.find(c => c.canvasId === activeCanvasId);

  // Bi-directional sync: Excalidraw -> Firestore Tasks
  const handleExcalidrawChange = useCallback((elements: readonly any[]) => {
    if (!excalidrawAPI || !activeCanvasId || activeCanvasId === 'new') return;

    // Debounce the sync to tasks
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      const textElements = elements.filter(el => el.type === 'text' && !el.isDeleted);
      
      for (const el of textElements) {
        // Convention: If text starts with [TASK:ID], it's linked
        const match = el.text.match(/^\[TASK:([\w-]+)\]\s*(.*)/);
        if (match) {
          const taskId = match[1];
          const newTitle = match[2];
          const task = tasks.find(t => t.taskId === taskId);
          
          if (task && task.title !== newTitle && newTitle.trim()) {
            console.log(`Syncing Excalidraw -> Task: ${taskId}`);
            await updateDoc(doc(db, `users/${userId}/tasks/${taskId}`), { title: newTitle });
          }
        }
      }
    }, 2000);
  }, [excalidrawAPI, activeCanvasId, userId, tasks]);

  useEffect(() => {
    if (activeCanvas) {
      setTitle(activeCanvas.title);
    } else if (activeCanvasId === 'new') {
      setTitle('New Ideation');
    }
  }, [activeCanvasId, activeCanvas]);

  const handleLinkTask = async (taskId: string) => {
    if (!activeCanvasId || activeCanvasId === 'new') return;
    try {
      await setDoc(doc(db, `users/${userId}/canvases/${activeCanvasId}`), { linkedTaskId: taskId }, { merge: true });
      if (taskId) {
        await setDoc(doc(db, `users/${userId}/tasks/${taskId}`), { linkedCanvasId: activeCanvasId }, { merge: true });
      }
    } catch (err) {
      console.error("Link error:", err);
    }
  };

  const handleSave = useCallback(async () => {
    if (!excalidrawAPI || !userId) return;
    
    setIsSaving(true);
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();
      
      const sceneJson = serializeAsJSON(elements, appState, files, 'database');
      const canvasId = activeCanvasId === 'new' ? crypto.randomUUID() : activeCanvasId;
      
      if (!canvasId) return;

      const canvasData: Canvas = {
        canvasId,
        title,
        excalidrawSceneJson: sceneJson,
        lastUpdated: new Date().toISOString()
      };

      await setDoc(doc(db, `users/${userId}/canvases/${canvasId}`), canvasData);
      if (activeCanvasId === 'new') setActiveCanvasId(canvasId);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  }, [excalidrawAPI, userId, activeCanvasId, title]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (activeCanvasId && activeCanvasId !== 'new') {
        handleSave();
      }
    }, 30000); 
    return () => clearInterval(timer);
  }, [activeCanvasId, handleSave]);

  const deleteCanvas = async (id: string) => {
    try {
      await deleteDoc(doc(db, `users/${userId}/canvases/${id}`));
      if (activeCanvasId === id) setActiveCanvasId(null);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  if (activeCanvasId) {
    return (
      <div className="h-[80vh] flex flex-col bg-[#F9F7F2] rounded-[40px] overflow-hidden border border-[#E2E8F0] shadow-2xl">
        <header className="p-6 bg-white border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveCanvasId(null)}
              className="p-2 hover:bg-[#F9F7F2] rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[#718096]" />
            </button>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-lexend font-bold text-xl text-[#2D3748] bg-transparent border-none focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-[#2D34FB]/5 rounded-lg text-[10px] font-bold text-[#2D34FB] uppercase tracking-widest border border-[#2D34FB]/10">
              <Plus className="w-3 h-3" />
              Use [TASK:ID] to sync
            </div>
            <select 
              value={activeCanvas?.linkedTaskId || ''}
              onChange={(e) => handleLinkTask(e.target.value)}
              className="hidden lg:block bg-[#F9F7F2] border border-[#E2E8F0] rounded-xl px-4 py-2 text-[10px] font-bold text-[#718096] uppercase tracking-widest focus:outline-none"
            >
              <option value="">Link to Task</option>
              {tasks.map(t => (
                <option key={t.taskId} value={t.taskId}>{t.title}</option>
              ))}
            </select>
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-[#718096] uppercase tracking-widest">
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {isSaving ? 'Syncing...' : 'Synced to Vault'}
            </div>
            <button 
              onClick={handleSave}
              className="bg-[#2D34FB] text-white px-6 py-2.5 rounded-xl font-lexend font-bold text-sm hover:bg-[#1A23D6] transition-all shadow-lg shadow-[#2D34FB]/10"
            >
              Push Update
            </button>
          </div>
        </header>

        <div className="flex-1 relative">
          <Excalidraw 
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            initialData={activeCanvas ? JSON.parse(activeCanvas.excalidrawSceneJson) : null}
            onChange={handleExcalidrawChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-lexend font-bold text-[#2D3748]">Creative Mesh</h2>
          <p className="text-[#718096] font-medium">Freeform ideation & architectural sketching.</p>
        </div>
        <button 
          onClick={() => {
            setActiveCanvasId('new');
            setTitle('New Ideation');
          }}
          className="bg-[#2D34FB] text-white px-8 py-4 rounded-2xl font-lexend font-bold text-sm shadow-xl shadow-[#2D34FB]/20 hover:bg-[#1A23D6] transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Initialize Canvas
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {canvases.map((canvas) => (
          <motion.div
            key={canvas.canvasId}
            whileHover={{ y: -8 }}
            className="group bg-white border border-[#E2E8F0] rounded-[40px] p-8 shadow-xl shadow-black/5 flex flex-col justify-between min-h-[280px]"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-[#F9F7F2] rounded-2xl flex items-center justify-center text-[#2D34FB]">
                <Palette className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-lexend font-bold text-[#2D3748] mb-1">{canvas.title}</h3>
                <p className="text-xs text-[#718096] font-medium uppercase tracking-widest">
                  Last Update: {new Date(canvas.lastUpdated).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-6">
              <button 
                onClick={() => setActiveCanvasId(canvas.canvasId)}
                className="flex-1 bg-[#2D34FB] text-white py-3 rounded-xl font-lexend font-bold text-sm hover:bg-[#1A23D6] transition-all flex items-center justify-center gap-2"
              >
                <Layout className="w-4 h-4" />
                Open Ideation
              </button>
              <button 
                onClick={() => deleteCanvas(canvas.canvasId)}
                className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}

        {canvases.length === 0 && (
          <div className="col-span-full h-64 border-2 border-dashed border-[#E2E8F0] rounded-[40px] flex flex-col items-center justify-center text-[#718096] gap-4">
            <Palette className="w-12 h-12 opacity-20" />
            <p className="font-lexend font-bold opacity-40 text-lg">No creative nodes provisioned.</p>
          </div>
        )}
      </div>
    </div>
  );
};
