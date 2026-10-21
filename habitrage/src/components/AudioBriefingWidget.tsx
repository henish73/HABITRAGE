import React from 'react';
import { Volume2 } from 'lucide-react';
import { HealthLog, Shift, Account } from '../types';

interface AudioBriefingWidgetProps {
  logs: HealthLog[];
  shifts: Shift[];
  accounts: Account[];
}

export const AudioBriefingWidget: React.FC<AudioBriefingWidgetProps> = ({ logs, shifts, accounts }) => {
  const speakBriefing = () => {
    const today = new Date().toDateString();
    const sleep = logs.find(l => new Date(l.date).toDateString() === today)?.sleepHours;
    const shift = shifts.find(s => new Date(s.shiftDate).toDateString() === today);
    const financeDue = accounts.filter(a => a.dueDate && new Date(a.dueDate).toDateString() === today);

    let text = "Good morning. Here is your daily audio briefing. ";
    text += sleep ? `Your sleep score last night was ${sleep.toFixed(1)} hours. ` : "No sleep data available. ";
    text += shift ? `You have a shift scheduled today. ` : "No scheduled shifts today. ";
    text += financeDue.length > 0 ? `You have financial dues for ${financeDue.map(f => f.name).join(', ')}. ` : "No financial dues today. ";

    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button onClick={speakBriefing} className="p-4 bg-white border border-[#E2E8F0] rounded-[22px] text-[#718096] hover:text-[#2D34FB]">
      <Volume2 className="w-5 h-5" />
    </button>
  );
};
