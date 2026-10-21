import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  Moon, 
  Scale, 
  Dna, 
  TrendingUp, 
  TrendingDown,
  Camera,
  Calendar,
  Shield,
  Zap,
  RefreshCw,
  Loader2,
  Heart
} from 'lucide-react';
import { HealthLog } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface HealthDashboardProps {
  userId: string;
  logs: HealthLog[];
  onVisionScan: () => void;
}

export const HealthDashboard: React.FC<HealthDashboardProps> = ({ userId, logs, onVisionScan }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [range, setRange] = useState<'day' | 'week' | 'month'>('week');
  
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const rangeDays = range === 'day' ? 1 : range === 'week' ? 7 : 30;
    return logs.filter(log => {
      const logDate = new Date(log.date);
      return (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24) <= rangeDays;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, range]);

  const latestLog = useMemo(() => filteredLogs[0] || null, [filteredLogs]);
  const recoveryScore = latestLog?.recoveryScore || 0;

  const handleHealthSync = async () => {
    setIsSyncing(true);
    // Simulate background sync from Health Connect
    await new Promise(r => setTimeout(r, 2000));
    
    try {
      const logId = crypto.randomUUID();
      const newLog: HealthLog = {
        logId,
        date: new Date().toISOString(),
        sleepHours: 7.5 + Math.random(),
        recoveryScore: Math.floor(60 + Math.random() * 30),
        weightKg: latestLog?.weightKg || 75,
        skeletalMusclePct: latestLog?.skeletalMusclePct || 38
      };
      await setDoc(doc(db, `users/${userId}/health_logs/${logId}`), newLog);
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const renphoMetrics = useMemo(() => [
    { label: 'Weight', value: latestLog?.weightKg ? `${latestLog.weightKg}kg` : '--', icon: Scale },
    { label: 'Body Fat', value: latestLog?.bodyFatPct ? `${latestLog.bodyFatPct}%` : '--', icon: Dna },
    { label: 'Muscle', value: latestLog?.skeletalMusclePct ? `${latestLog.skeletalMusclePct}%` : '--', icon: Activity },
  ], [latestLog]);
  
  const healthConnectMetrics = useMemo(() => [
    { label: 'Steps', value: latestLog?.steps ? `${(latestLog.steps || 0).toLocaleString()}` : '--', icon: Activity },
    { label: 'Calories', value: latestLog?.activeCaloriesBurned ? `${latestLog.activeCaloriesBurned}kcal` : '--', icon: Zap },
    { label: 'HR', value: latestLog?.restingHeartRate ? `${latestLog.restingHeartRate}bpm` : '--', icon: Heart },
  ], [latestLog]);

  const circumference = 2 * Math.PI * 45; // r=45
  const offset = circumference - (recoveryScore / 100) * circumference;

  return (
    <div className="space-y-12">
      {/* Range Selector */}
      <div className="flex gap-2">
        {(['day', 'week', 'month'] as const).map(r => (
          <button 
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase ${range === r ? 'bg-[#2D3748] text-white' : 'bg-white text-[#718096] border border-[#E2E8F0]'}`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Recovery Ring Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#2D3748] rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl shadow-black/10">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="45"
                  className="stroke-white/10 fill-none"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="45"
                  className="stroke-[#8DAA91] fill-none"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-lexend font-bold">{recoveryScore}%</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Recovery</span>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div>
                <h2 className="text-3xl font-lexend font-bold mb-2">Vitalization State</h2>
                <p className="text-white/60 text-sm leading-relaxed max-w-md">
                  Your biometric mesh indicates optimal autonomic recovery. Deep work window is currently high.
                </p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={onVisionScan}
                  className="flex items-center gap-2 bg-white text-[#2D3748] px-6 py-3 rounded-2xl font-lexend font-bold text-sm hover:bg-[#8DAA91] hover:text-white transition-all shadow-lg shadow-black/20"
                >
                  <Camera className="w-4 h-4" />
                  Renpho Vision Scan
                </button>
                <button 
                  onClick={handleHealthSync}
                  disabled={isSyncing}
                  className="flex items-center gap-2 bg-[#F9F7F2] text-[#2D3748] px-6 py-3 rounded-2xl font-lexend font-bold text-sm hover:bg-[#E2E8F0] transition-all disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4 text-red-500" />}
                  Health Connect
                </button>
              </div>
            </div>
          </div>

          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#8DAA91]/20 to-transparent rounded-full -mr-20 -mt-20 blur-3xl" />
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[40px] p-8 shadow-xl shadow-black/5 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-lexend font-bold text-[#2D3748]">System Readiness</h3>
              <Shield className="w-5 h-5 text-[#8DAA91]" />
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs text-[#718096] uppercase font-bold tracking-widest">Metabolic Load</span>
                <span className="text-xl font-lexend font-bold text-[#2D3748]">Normal</span>
              </div>
              <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '45%' }}
                  className="h-full bg-[#8DAA91]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#F9F7F2] rounded-2xl">
                <p className="text-[10px] text-[#718096] uppercase font-bold tracking-widest mb-1">HRV Baseline</p>
                <p className="font-lexend font-bold text-[#2D3748]">64ms</p>
              </div>
              <div className="p-4 bg-[#F9F7F2] rounded-2xl">
                <p className="text-[10px] text-[#718096] uppercase font-bold tracking-widest mb-1">Active Burn</p>
                <p className="font-lexend font-bold text-[#2D3748]">420kcal</p>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-[#F1F5F9] flex items-center gap-2 text-[10px] text-[#718096] font-bold uppercase tracking-widest">
            <Zap className="w-3 h-3 text-[#2D34FB]" />
            Sync 4 minutes ago
          </div>
        </div>
      </div>

      {/* Metric Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="font-lexend font-bold text-[#2D3748]">Renpho Composition</h3>
          <div className="grid grid-cols-2 gap-4">
            {renphoMetrics.map((m) => (
              <div key={m.label} className="bg-white border border-[#E2E8F0] p-6 rounded-[32px] shadow-sm">
                <m.icon className="w-5 h-5 text-[#8DAA91] mb-4" />
                <p className="text-[10px] text-[#718096] uppercase font-bold tracking-widest mb-1">{m.label}</p>
                <h4 className="text-xl font-lexend font-bold text-[#2D3748]">{m.value}</h4>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-lexend font-bold text-[#2D3748]">Health Connect Activity</h3>
          <div className="grid grid-cols-2 gap-4">
            {healthConnectMetrics.map((m) => (
              <div key={m.label} className="bg-white border border-[#E2E8F0] p-6 rounded-[32px] shadow-sm">
                <m.icon className="w-5 h-5 text-[#2D34FB] mb-4" />
                <p className="text-[10px] text-[#718096] uppercase font-bold tracking-widest mb-1">{m.label}</p>
                <h4 className="text-xl font-lexend font-bold text-[#2D3748]">{m.value}</h4>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historical Logs */}
      <div className="bg-white border border-[#E2E8F0] rounded-[32px] overflow-hidden shadow-xl shadow-black/5">
        <div className="px-8 py-6 border-b border-[#E2E8F0] bg-[#F9F7F2]/50 flex items-center justify-between">
          <h3 className="font-lexend font-bold text-[#2D3748]">Telemetry Logs</h3>
          <Calendar className="w-4 h-4 text-[#718096]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                <th className="px-8 py-4 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Date</th>
                <th className="px-8 py-4 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Weight</th>
                <th className="px-8 py-4 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Body Fat</th>
                <th className="px-8 py-4 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Muscle</th>
                <th className="px-8 py-4 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest text-right">Recovery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredLogs.map((log, index) => (
                <tr key={log.logId || index} className="hover:bg-[#F9F7F2]/30 transition-colors">
                  <td className="px-8 py-4 text-sm font-medium text-[#2D3748]">
                    {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-8 py-4 text-sm text-[#718096] font-lexend">{log.weightKg || '--'}kg</td>
                  <td className="px-8 py-4 text-sm text-[#718096] font-lexend">{log.bodyFatPct || '--'}%</td>
                  <td className="px-8 py-4 text-sm text-[#718096] font-lexend">{(log.steps || 0).toLocaleString()} steps</td>
                  <td className="px-8 py-4 text-right">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold",
                      (log.recoveryScore || 0) > 70 ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                    )}>
                      {log.recoveryScore || '--'}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
