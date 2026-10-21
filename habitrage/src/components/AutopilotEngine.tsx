import React, { useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, collection, addDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { AppState, Task, AutopilotLog } from '../types';

interface AutopilotEngineProps {
  state: AppState;
}

export const AutopilotEngine: React.FC<AutopilotEngineProps> = ({ state }) => {
  const lastProcessedHealthId = useRef<string | null>(null);
  const lastProcessedFinanceTimestamp = useRef<number>(0);
  const lastProcessedWeeklyTimestamp = useRef<number>(0);
  const lastProcessedCircadianTimestamp = useRef<number>(0);
  const lastProcessedShiftScarcityTimestamp = useRef<number>(0);
  const lastProcessedEhrTimestamp = useRef<number>(0);
  const lastProcessedCognitiveTimestamp = useRef<number>(0);

  useEffect(() => {
    if (!state.user || state.loading) return;

    const runAutomations = async () => {
      const now = Date.now();
      const today = new Date();
      const todayStr = today.toDateString();

      // 1. Health-Recovery Feedback (Automation C)
      // ... existing health logic ...
      const latestHealth = state.healthLogs[0];
      if (latestHealth && latestHealth.recoveryScore && latestHealth.recoveryScore < 50 && latestHealth.logId !== lastProcessedHealthId.current) {
        lastProcessedHealthId.current = latestHealth.logId;
        const deepWorkTasks = state.tasks.filter(t => t.energyTag === 'deep_work' && t.status !== 'completed');
        if (deepWorkTasks.length > 0) {
          for (const task of deepWorkTasks) {
            await updateDoc(doc(db, `users/${state.user.uid}/tasks/${task.taskId}`), { energyTag: 'low' });
          }
          const log: AutopilotLog = {
            logId: crypto.randomUUID(),
            type: 'health_recovery',
            message: `Autopilot downgraded ${deepWorkTasks.length} tasks to Low Energy due to recovery score (${latestHealth.recoveryScore}).`,
            timestamp: new Date().toISOString(),
            impact: 'high'
          };
          await setDoc(doc(db, `users/${state.user.uid}/autopilot_logs/${log.logId}`), log);
        }
      }

      // 2. Financial Stress Triggers (Automation D)
      if (now - lastProcessedFinanceTimestamp.current > 3600000) {
        lastProcessedFinanceTimestamp.current = now;
        for (const account of state.accounts) {
          if (account.type === 'credit_card' && account.creditLimit) {
            const utilization = (account.principalBalance / account.creditLimit) * 100;
            if (utilization > 30) {
              const taskTitle = `Optimize utilization: ${account.name}`;
              const exists = state.tasks.find(t => t.title === taskTitle && t.status !== 'completed');
              if (!exists) {
                const taskId = crypto.randomUUID();
                const task: Task = {
                  taskId,
                  title: taskTitle,
                  status: 'todo',
                  energyTag: 'deep_work',
                  dueDate: new Date().toISOString(),
                  originalDueDate: new Date().toISOString(),
                  rescheduleCount: 0
                };
                await setDoc(doc(db, `users/${state.user.uid}/tasks/${taskId}`), task);
                const log: AutopilotLog = {
                  logId: crypto.randomUUID(),
                  type: 'financial_stress',
                  message: `Financial stress detected: ${account.name} utilization @ ${utilization.toFixed(1)}%. Debt reduction task provisioned.`,
                  timestamp: new Date().toISOString(),
                  impact: 'high'
                };
                await setDoc(doc(db, `users/${state.user.uid}/autopilot_logs/${log.logId}`), log);
              }
            }
          }
        }
      }

      // 3. Weekly AI Retrospective Audit (Automation D)
      // Run every Sunday
      if (today.getDay() === 0 && now - lastProcessedWeeklyTimestamp.current > 86400000) {
        lastProcessedWeeklyTimestamp.current = now;
        const last7Days = state.journalEntries.filter(e => {
          const d = new Date(e.timestamp);
          return d.getTime() > now - 7 * 24 * 60 * 60 * 1000;
        });

        const completedTasks = state.tasks.filter(t => t.status === 'completed' && new Date(t.dueDate).getTime() > now - 7 * 24 * 60 * 60 * 1000);

        const summary = `Weekly Executive Retrospective. Pillars maintained: Journal (${last7Days.length} nodes), Tasks (${completedTasks.length} cycles completed). Yield optimization stable.`;
        
        const entryId = crypto.randomUUID();
        await setDoc(doc(db, `users/${state.user.uid}/journal_entries/${entryId}`), {
          entryId,
          text: summary,
          timestamp: new Date().toISOString(),
          sentimentScore: 0.8
        });

        const log: AutopilotLog = {
          logId: crypto.randomUUID(),
          type: 'journal_distillation',
          message: `Weekly retrospective generated and pushed to Journal pillar.`,
          timestamp: new Date().toISOString(),
          impact: 'medium'
        };
        await setDoc(doc(db, `users/${state.user.uid}/autopilot_logs/${log.logId}`), log);
      }

      // 4. Circadian Scheduler (Automation G)
      // Run once a day to optimize tomorrow's deep work
      if (now - lastProcessedCircadianTimestamp.current > 86400000) {
        lastProcessedCircadianTimestamp.current = now;
        const deepWorkTasks = state.tasks.filter(t => t.energyTag === 'deep_work' && t.status === 'todo');
        
        if (deepWorkTasks.length > 0) {
          const tomorrow = new Date(now + 86400000);
          tomorrow.setHours(9, 0, 0, 0); // Optimal energy peak

          for (const task of deepWorkTasks.slice(0, 2)) {
            await updateDoc(doc(db, `users/${state.user.uid}/tasks/${task.taskId}`), {
              dueDate: tomorrow.toISOString()
            });
          }

          const log: AutopilotLog = {
            logId: crypto.randomUUID(),
            type: 'yield_optimization',
            message: `Circadian scheduler optimized ${Math.min(deepWorkTasks.length, 2)} tasks for tomorrow's 09:00 peak.`,
            timestamp: new Date().toISOString(),
            impact: 'medium'
          };
          await setDoc(doc(db, `users/${state.user.uid}/autopilot_logs/${log.logId}`), log);
        }
      }

      // 5. Shift Scarcity Detection (Automation H)
      // If no shifts in the next 7 days, trigger search task
      if (now - lastProcessedShiftScarcityTimestamp.current > 86400000) {
        lastProcessedShiftScarcityTimestamp.current = now;
        const upcomingShifts = state.shifts.filter(s => {
          const d = new Date(s.shiftDate);
          return d.getTime() > now && d.getTime() < now + 7 * 24 * 60 * 60 * 1000;
        });

        if (upcomingShifts.length === 0) {
          const taskTitle = "Strategic Yield Search: Secure upcoming deployments";
          const exists = state.tasks.find(t => t.title === taskTitle && t.status !== 'completed');
          if (!exists) {
            const taskId = crypto.randomUUID();
            await setDoc(doc(db, `users/${state.user.uid}/tasks/${taskId}`), {
              taskId,
              title: taskTitle,
              status: 'todo',
              energyTag: 'deep_work',
              dueDate: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
              originalDueDate: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
              rescheduleCount: 0
            });
            const log: AutopilotLog = {
              logId: crypto.randomUUID(),
              type: 'yield_optimization',
              message: "Shift scarcity detected (0 upcoming in 7d). Provisioned strategic search task.",
              timestamp: new Date().toISOString(),
              impact: 'high'
            };
            await setDoc(doc(db, `users/${state.user.uid}/autopilot_logs/${log.logId}`), log);
          }
        }
      }

      // 6. EHR Threshold Alert (Automation I)
      // If EHR < target, flag for audit
      if (now - lastProcessedEhrTimestamp.current > 86400000) {
        lastProcessedEhrTimestamp.current = now;
        const totalHours = state.shifts.reduce((sum, s) => sum + s.scheduledHours, 0);
        const totalNet = state.shifts.reduce((sum, s) => sum + s.netEstimatedPay, 0);
        const ehr = totalHours > 0 ? totalNet / totalHours : 0;

        if (ehr > 0 && ehr < 25) { // Target $25/hr net
          const taskTitle = `Yield Audit: EHR detected at $${ehr.toFixed(2)} (Target $25+)`;
          const exists = state.tasks.find(t => t.title === taskTitle && t.status !== 'completed');
          if (!exists) {
            const taskId = crypto.randomUUID();
            await setDoc(doc(db, `users/${state.user.uid}/tasks/${taskId}`), {
              taskId,
              title: taskTitle,
              status: 'todo',
              energyTag: 'deep_work',
              dueDate: new Date().toISOString(),
              originalDueDate: new Date().toISOString(),
              rescheduleCount: 0
            });
            const log: AutopilotLog = {
              logId: crypto.randomUUID(),
              type: 'yield_optimization',
              message: `Efficiency warning: EHR ($${ehr.toFixed(2)}) is below mission threshold. Provisioned yield audit.`,
              timestamp: new Date().toISOString(),
              impact: 'medium'
            };
            await setDoc(doc(db, `users/${state.user.uid}/autopilot_logs/${log.logId}`), log);
          }
        }
      }

      // 7. Cognitive Overload Protection (Automation J)
      if (now - lastProcessedCognitiveTimestamp.current > 3600000) {
        lastProcessedCognitiveTimestamp.current = now;
        const completedToday = state.tasks.filter(t => 
          t.status === 'completed' && 
          t.energyTag === 'deep_work' &&
          new Date(t.dueDate).toDateString() === todayStr
        );

        if (completedToday.length >= 3) {
          const log: AutopilotLog = {
            logId: crypto.randomUUID(),
            type: 'health_recovery',
            message: `Cognitive overload: ${completedToday.length} deep work cycles completed today. Autopilot recommends immediate restoration phase.`,
            timestamp: new Date().toISOString(),
            impact: 'medium'
          };
          await setDoc(doc(db, `users/${state.user.uid}/autopilot_logs/${log.logId}`), log);
        }
      }
    };

    runAutomations();
  }, [state.healthLogs, state.accounts, state.shifts, state.tasks, state.journalEntries, state.user, state.loading]);

  return null; // Logic only component
};
