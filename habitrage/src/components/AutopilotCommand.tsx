import React from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  Activity, 
  ShieldCheck, 
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { AutopilotLog, AppState } from '../types';

interface AutopilotCommandProps {
  state: AppState;
}

export const AutopilotCommand: React.FC<AutopilotCommandProps> = ({ state }) => {
  const logs = state.autopilotLogs.slice().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, 3);
  
  const getIcon = (type: AutopilotLog['type']) => {
    switch (type) {
      case 'health_recovery': return <Activity className="w-4 h-4 text-orange-500" />;
      case 'financial_stress': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'journal_distillation': return <ShieldCheck className="w-4 h-4 text-[#2D34FB]" />;
      case 'yield_optimization': return <Zap className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2D34FB] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#2D34FB]/20">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-lexend font-bold text-[#2D3748]">Sovereign Autopilot</h3>
            <p className="text-[10px] font-bold text-[#718096] uppercase tracking-widest flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin-slow" />
              Monitoring Mesh Telemetry
            </p>
          </div>
        </div>
        <div className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
          Active
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {logs.map((log) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={log.logId}
            className="p-4 bg-[#F9F7F2] rounded-2xl border border-[#E2E8F0] space-y-2 group hover:border-[#2D34FB]/30 transition-all cursor-default"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getIcon(log.type)}
                <span className="text-[10px] font-bold text-[#2D3748] uppercase tracking-widest">
                  {log.type.replace('_', ' ')}
                </span>
              </div>
              <span className="text-[10px] text-[#718096] font-medium">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs text-[#718096] leading-relaxed font-medium group-hover:text-[#2D3748] transition-colors">
              {log.message}
            </p>
          </motion.div>
        ))}
        {logs.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center text-[#E2E8F0] space-y-2">
            <ShieldCheck className="w-8 h-8 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest opacity-40">No mutations logged</p>
          </div>
        )}
      </div>

      <button className="w-full py-4 bg-[#2D3748] text-white rounded-2xl font-lexend font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1A202C] transition-all group">
        System Override
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};
