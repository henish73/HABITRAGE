import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  RefreshCw,
  MoreVertical,
  Briefcase,
  Plus,
  Trash2
} from 'lucide-react';
import { Shift, EmployerConfig } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ShiftCalendarProps {
  shifts: Shift[];
  employers: EmployerConfig[];
  onSync: () => void;
  syncing: boolean;
  onDateClick?: (date: string) => void;
  onShiftMove?: (shiftId: string, newDate: string) => void;
  onShiftDelete?: (shiftId: string) => void;
}

type ViewType = 'month' | 'week' | 'day';

export const ShiftCalendar: React.FC<ShiftCalendarProps> = ({ 
  shifts, 
  employers, 
  onSync, 
  syncing,
  onDateClick,
  onShiftMove,
  onShiftDelete
}) => {
  const [view, setView] = useState<ViewType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedShiftId, setDraggedShiftId] = useState<string | null>(null);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, current: false });
    }
    // Days of current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, current: true, date: new Date(year, month, i) });
    }
    return days;
  }, [currentDate]);

  const shiftsByDate = useMemo(() => {
    const map: Record<string, Shift[]> = {};
    shifts.forEach(s => {
      const dateStr = new Date(s.shiftDate).toDateString();
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(s);
    });
    return map;
  }, [shifts]);

  const handleDragStart = (e: React.DragEvent, shiftId: string) => {
    setDraggedShiftId(shiftId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedShiftId && onShiftMove) {
      // Create local ISO string date part
      const dateStr = toLocalDateStr(date);
      onShiftMove(draggedShiftId, dateStr);
    }
    setDraggedShiftId(null);
  };

  const toLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[40px] overflow-hidden shadow-2xl shadow-black/5">
      <header className="p-8 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#F9F7F2]/30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => navigate('prev')}
              className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-[#E2E8F0]"
            >
              <ChevronLeft className="w-5 h-5 text-[#718096]" />
            </button>
            <h3 className="text-xl font-lexend font-bold text-[#2D3748] min-w-[140px] text-center">
              {monthName} {year}
            </h3>
            <button 
              type="button"
              onClick={() => navigate('next')}
              className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-[#E2E8F0]"
            >
              <ChevronRight className="w-5 h-5 text-[#718096]" />
            </button>
          </div>

          <div className="flex bg-[#F1F5F9] p-1 rounded-2xl">
            {(['month', 'week', 'day'] as ViewType[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-lexend font-bold uppercase tracking-widest transition-all",
                  view === v ? "bg-white text-[#2D34FB] shadow-sm" : "text-[#718096]"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <button 
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="flex items-center gap-3 bg-[#2D34FB] text-white px-6 py-3 rounded-2xl font-lexend font-bold text-sm shadow-xl shadow-[#2D34FB]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
          {syncing ? 'Syncing...' : 'Sync Calendar'}
        </button>
      </header>

      <div className="p-4 md:p-8">
        <AnimatePresence mode="wait">
          {view === 'month' && (
            <motion.div 
              key="month"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-7 gap-px bg-[#E2E8F0] border border-[#E2E8F0] rounded-2xl overflow-hidden"
            >
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="bg-[#F9F7F2] py-4 text-center text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">
                  {d}
                </div>
              ))}
              {daysInMonth.map((dayObj, i) => {
                const shiftsOnDay = dayObj.date ? shiftsByDate[dayObj.date.toDateString()] || [] : [];
                const isToday = dayObj.date?.toDateString() === new Date().toDateString();

                return (
                  <div 
                    key={i} 
                    className={cn(
                      "min-h-[140px] bg-white p-4 space-y-3 relative group transition-colors cursor-pointer",
                      !dayObj.current && "bg-[#F9F7F2]/50",
                      isToday && "ring-1 ring-inset ring-[#2D34FB]"
                    )}
                    onClick={() => dayObj.date && onDateClick?.(toLocalDateStr(dayObj.date))}
                    onDragOver={handleDragOver}
                    onDrop={(e) => dayObj.date && handleDrop(e, dayObj.date)}
                  >
                    <div className="flex justify-between items-center">
                      <span className={cn(
                        "text-xs font-lexend font-bold",
                        dayObj.current ? "text-[#2D3748]" : "text-[#E2E8F0]",
                        isToday && "text-[#2D34FB]"
                      )}>
                        {dayObj.day || ''}
                      </span>
                      {dayObj.current && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dayObj.date && onDateClick?.(toLocalDateStr(dayObj.date));
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#2D34FB]/5 rounded-lg text-[#2D34FB] transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {shiftsOnDay.map(shift => {
                        const employer = employers.find(e => e.employerId === shift.employerId);
                        return (
                          <div 
                            key={shift.shiftId}
                            draggable
                            onDragStart={(e) => handleDragStart(e, shift.shiftId)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                              borderLeftColor: employer?.color || '#2D34FB',
                              backgroundColor: (employer?.color || '#2D34FB') + '10'
                            }}
                            className="border-l-4 p-2 rounded-lg text-[10px] font-medium text-[#2D3748] flex flex-col gap-0.5 transition-all cursor-move shadow-sm hover:shadow-md active:scale-95 group/shift"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="font-bold truncate">{employer?.name || 'Shift'}</div>
                              {onShiftDelete && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShiftDelete(shift.shiftId);
                                  }}
                                  className="opacity-0 group-hover/shift:opacity-100 p-0.5 hover:bg-red-50 rounded text-[#718096] hover:text-red-500 transition-all"
                                  title="Delete Shift"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[#718096]">
                              <Clock className="w-2.5 h-2.5" />
                              {shift.startTime}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {view === 'week' && (
            <motion.div 
              key="week"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {[0, 1, 2, 3, 4, 5, 6].map(i => {
                const d = new Date(currentDate);
                d.setDate(currentDate.getDate() - currentDate.getDay() + i);
                const shiftsOnDay = shiftsByDate[d.toDateString()] || [];
                const isToday = d.toDateString() === new Date().toDateString();

                return (
                  <div key={i} className={cn(
                    "bg-white border border-[#E2E8F0] rounded-[24px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all",
                    isToday && "border-[#2D34FB] bg-[#2D34FB]/5 shadow-lg shadow-[#2D34FB]/5"
                  )}>
                    <div className="flex items-center gap-6">
                      <button 
                        type="button"
                        onClick={() => onDateClick?.(toLocalDateStr(d))}
                        className="w-16 h-16 bg-[#F9F7F2] rounded-[20px] flex flex-col items-center justify-center border border-[#E2E8F0] hover:border-[#2D34FB]/30 hover:bg-[#2D34FB]/5 transition-all"
                      >
                        <span className="text-[10px] font-lexend font-bold text-[#718096] uppercase">{d.toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-2xl font-lexend font-bold text-[#2D3748] leading-none">{d.getDate()}</span>
                      </button>
                      <div className="space-y-1">
                        <h4 className="font-lexend font-bold text-[#2D3748]">{d.toLocaleString('default', { weekday: 'long' })}</h4>
                        <p className="text-sm text-[#718096]">{shiftsOnDay.length} Shifts Scheduled</p>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-wrap gap-3">
                      {shiftsOnDay.map(shift => {
                        const employer = employers.find(e => e.employerId === shift.employerId);
                        return (
                          <div 
                            key={shift.shiftId} 
                            style={{ borderLeftColor: employer?.color || '#2D34FB' }}
                            className="bg-white border border-[#E2E8F0] border-l-4 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-sm"
                          >
                            <Briefcase className="w-4 h-4 text-[#2D34FB]" />
                            <div>
                              <p className="text-xs font-bold text-[#2D3748]">{employer?.name || 'Work'}</p>
                              <p className="text-[10px] text-[#718096]">{shift.startTime} - {shift.endTime}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {view === 'day' && (
            <motion.div 
              key="day"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-6 p-8 bg-[#2D3748] rounded-[32px] text-white">
                <div className="w-20 h-20 bg-white/10 rounded-[28px] flex flex-col items-center justify-center border border-white/20">
                  <span className="text-xs font-lexend font-bold text-white/50 uppercase tracking-widest">{currentDate.toLocaleString('default', { month: 'short' })}</span>
                  <span className="text-4xl font-lexend font-bold leading-none">{currentDate.getDate()}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-lexend font-bold">{currentDate.toLocaleString('default', { weekday: 'long' })}</h3>
                  <p className="text-white/60 font-medium">Daily Deployment Briefing</p>
                </div>
              </div>

              <div className="space-y-6">
                {(shiftsByDate[currentDate.toDateString()] || []).length === 0 ? (
                  <div className="bg-[#F9F7F2] border border-dashed border-[#E2E8F0] rounded-[32px] p-20 text-center space-y-3">
                    <CalendarIcon className="w-12 h-12 text-[#E2E8F0] mx-auto" />
                    <p className="text-[#718096] font-medium">No shifts detected for this deployment window.</p>
                  </div>
                ) : (
                  shiftsByDate[currentDate.toDateString()].map(shift => {
                    const employer = employers.find(e => e.employerId === shift.employerId);
                    return (
                      <div 
                        key={shift.shiftId} 
                        style={{ borderLeftColor: employer?.color || '#2D34FB' }}
                        className="bg-white border border-[#E2E8F0] border-l-8 rounded-[32px] p-8 flex items-center justify-between group hover:border-[#2D34FB]/30 transition-all shadow-lg shadow-black/5"
                      >
                        <div className="flex items-center gap-8">
                          <div className="w-16 h-16 bg-[#2D34FB]/5 rounded-[24px] flex items-center justify-center text-[#2D34FB]">
                            <Briefcase className="w-8 h-8" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-2xl font-lexend font-bold text-[#2D3748]">{employer?.name || 'Shift'}</h4>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 text-sm text-[#718096] font-medium">
                                <Clock className="w-4 h-4" />
                                {shift.startTime} - {shift.endTime}
                              </div>
                              <div className="w-1 h-1 bg-[#E2E8F0] rounded-full" />
                              <div className="text-sm text-[#718096] font-medium">{shift.scheduledHours} hrs</div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-lexend font-bold text-[#2D34FB]">${shift.netEstimatedPay.toFixed(2)}</div>
                          <div className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-[0.2em]">Estimated Net Yield</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
