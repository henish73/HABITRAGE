import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Briefcase, 
  Target, 
  TrendingUp, 
  Plus, 
  CheckCircle2, 
  ChevronRight,
  Loader2,
  Settings,
  ShieldCheck,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Milestone, Shift, EmployerConfig } from '../types';
import { ShiftCalendar } from './ShiftCalendar';
import { EmployerSettingsModal } from './EmployerSettingsModal';
import { ShiftPredictor } from './ShiftPredictor';
import { importShiftsFromGoogle } from '../lib/gcalSync';

interface ProfessionalExpansionProps {
  userId: string;
  shifts: Shift[];
  milestones: Milestone[];
  googleAccessToken: string | null;
  employers: EmployerConfig[];
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export const ProfessionalExpansion: React.FC<ProfessionalExpansionProps> = ({ 
  userId, 
  shifts, 
  milestones,
  googleAccessToken,
  employers,
  onSuccess,
  onError
}) => {
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', targetDate: '' });
  const [loading, setLoading] = useState(false);
  const [draftDate, setDraftDate] = useState<string | null>(null);

  const calculateEHR = () => {
    const totalHours = shifts.reduce((sum, s) => sum + s.scheduledHours, 0);
    // Use netEstimatedPay from the shift if available, else 0
    const totalNetPay = shifts.reduce((sum, s) => sum + (s.netEstimatedPay || 0), 0);
    return totalHours > 0 ? totalNetPay / totalHours : 0;
  };

  const handleSyncCalendar = async () => {
    if (!googleAccessToken || !userId || employers.length === 0) return;
    setSyncing(true);
    try {
      const imported = await importShiftsFromGoogle(googleAccessToken, employers);
      
      for (const shift of imported) {
        const safeStartTime = shift.startTime.replace(/:/g, '-');
        const shiftId = `google_${shift.employerId}_${shift.shiftDate}_${safeStartTime}`;
        const payload = {
          ...shift,
          shiftId,
          status: 'scheduled',
          netEstimatedPay: 0,
          grossEstimatedPay: 0,
          hourlyRateOverride: shift.hourlyRateOverride || 0
        };
        await setDoc(doc(db, `users/${userId}/shifts/${shiftId}`), payload, { merge: true });
      }
      onSuccess?.("Calendar nodes synchronized to mesh.");
    } catch (err) {
      console.error("Sync calendar error:", err);
      onError?.("Calendar sync failure.");
    } finally {
      setSyncing(false);
    }
  };

  const handleShiftMove = async (shiftId: string, newDate: string) => {
    try {
      const shift = shifts.find(s => s.shiftId === shiftId);
      if (shift) {
        const payload = {
          ...shift,
          shiftDate: newDate,
          hourlyRateOverride: shift.hourlyRateOverride || 0
        };
        await setDoc(doc(db, `users/${userId}/shifts/${shiftId}`), payload, { merge: true });
        onSuccess?.("Shift temporal recalibration successful.");
      }
    } catch (err) {
      console.error("Shift move error:", err);
      onError?.("Temporal shift failure.");
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone.title || !userId) return;

    setLoading(true);
    try {
      const milestoneId = crypto.randomUUID();
      const milestoneData: Milestone = {
        milestoneId,
        title: newMilestone.title,
        description: newMilestone.description,
        targetDate: newMilestone.targetDate,
        status: 'pending'
      };

      await setDoc(doc(db, `users/${userId}/milestones/${milestoneId}`), milestoneData);
      setNewMilestone({ title: '', description: '', targetDate: '' });
      setShowAddMilestone(false);
      onSuccess?.("New milestone node initialized.");
    } catch (err) {
      console.error("Add milestone error:", err);
      onError?.("Milestone initialization failed.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMilestone = async (milestone: Milestone) => {
    try {
      const updated: Milestone = {
        ...milestone,
        status: milestone.status === 'achieved' ? 'pending' : 'achieved',
        completedDate: milestone.status === 'pending' ? new Date().toISOString() : undefined
      };
      await setDoc(doc(db, `users/${userId}/milestones/${milestone.milestoneId}`), updated);
      onSuccess?.("Milestone status recalibrated.");
    } catch (err) {
      console.error("Toggle milestone error:", err);
      onError?.("Status update failure.");
    }
  };

  const deleteMilestone = async (milestoneId: string) => {
    try {
      await deleteDoc(doc(db, `users/${userId}/milestones/${milestoneId}`));
      onSuccess?.("Milestone node decommissioned.");
    } catch (err) {
      console.error("Delete milestone error:", err);
      onError?.("Decommission failure.");
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      await deleteDoc(doc(db, `users/${userId}/shifts/${shiftId}`));
      onSuccess?.("Shift purged from mesh.");
    } catch (err: any) {
      console.error("Delete shift error:", err);
      onError?.("Purge failure.");
    }
  };

  const ehr = calculateEHR();

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-lexend font-bold text-[#2D3748]">Professional Yield</h2>
          <p className="text-[#718096] font-medium">Milestone tracking & operational efficiency.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-3 bg-white border border-[#E2E8F0] rounded-2xl text-[#718096] hover:text-[#2D34FB] hover:border-[#2D34FB]/30 transition-all shadow-sm"
          >
            <Settings className="w-6 h-6" />
          </button>
          <div className="bg-white border border-[#E2E8F0] px-6 py-3 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="text-right">
              <p className="text-[10px] font-bold text-[#718096] uppercase tracking-widest">Effective Hourly Rate</p>
              <p className="text-2xl font-lexend font-bold text-[#2D34FB]">${ehr.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-[#2D34FB]/20" />
          </div>
        </div>
      </header>

      {showSettings && (
        <EmployerSettingsModal 
          userId={userId}
          employers={employers}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Deployment Calendar */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-xl font-lexend font-bold text-[#2D3748]">
          <ShieldCheck className="w-6 h-6 text-[#2D34FB]" />
          Deployment Calendar
        </div>
        <ShiftCalendar 
          shifts={shifts}
          employers={employers}
          onSync={handleSyncCalendar}
          syncing={syncing}
          onDateClick={(date) => setDraftDate(date)}
          onShiftMove={handleShiftMove}
          onShiftDelete={handleDeleteShift}
        />
      </section>

      <div className="pt-12 border-t border-[#E2E8F0]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-lexend font-bold text-[#2D3748]">Shift Analytics & Forecasting</h3>
          <button 
            type="button"
            onClick={() => setDraftDate(new Date().toISOString().split('T')[0])}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-[#E2E8F0] rounded-2xl font-lexend font-bold text-sm text-[#718096] hover:border-[#2D34FB]/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Manual Deployment
          </button>
        </div>
        <ShiftPredictor 
          userId={userId} 
          shifts={shifts} 
          employers={employers}
          googleAccessToken={googleAccessToken}
        />
      </div>

      {/* Hidden ShiftPredictor Triggered by Calendar */}
      {draftDate && (
        <ShiftPredictor 
          userId={userId}
          shifts={shifts}
          employers={employers}
          googleAccessToken={googleAccessToken}
          initialDate={draftDate}
          onClose={() => setDraftDate(null)}
          forceOpen={true}
          modalOnly={true}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-lexend font-bold text-[#2D3748] flex items-center gap-3">
              <Target className="w-6 h-6 text-[#2D34FB]" />
              Strategic Milestones
            </h3>
            <button 
              onClick={() => setShowAddMilestone(true)}
              className="p-2 bg-[#2D34FB]/5 text-[#2D34FB] rounded-xl hover:bg-[#2D34FB]/10 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {showAddMilestone && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#F9F7F2] border border-[#E2E8F0] rounded-[32px] p-8 space-y-6"
              >
                <form onSubmit={handleAddMilestone} className="space-y-4">
                  <input 
                    autoFocus
                    placeholder="Milestone Title"
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-[#2D34FB]/10"
                  />
                  <textarea 
                    placeholder="Strategy/Description"
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-[#2D34FB]/10 h-24"
                  />
                  <div className="flex items-center gap-4">
                    <input 
                      type="date"
                      value={newMilestone.targetDate}
                      onChange={(e) => setNewMilestone({ ...newMilestone, targetDate: e.target.value })}
                      className="flex-1 bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-[#2D34FB]/10"
                    />
                    <button 
                      type="submit"
                      disabled={loading || !newMilestone.title}
                      className="bg-[#2D34FB] text-white px-8 py-3 rounded-xl font-lexend font-bold hover:bg-[#1A23D6] transition-all disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Deploy'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {milestones.map((milestone) => (
              <div 
                key={milestone.milestoneId}
                className={`bg-white border border-[#E2E8F0] rounded-[32px] p-8 shadow-lg shadow-black/5 flex items-start gap-6 transition-all ${milestone.status === 'achieved' ? 'opacity-50' : ''}`}
              >
                <button 
                  onClick={() => toggleMilestone(milestone)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${milestone.status === 'achieved' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-[#F9F7F2] text-[#E2E8F0] hover:text-[#2D34FB]'}`}
                >
                  <CheckCircle2 className="w-6 h-6" />
                </button>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xl font-lexend font-bold text-[#2D3748] ${milestone.status === 'achieved' ? 'line-through' : ''}`}>
                      {milestone.title}
                    </h4>
                    <div className="flex items-center gap-4">
                      {milestone.targetDate && (
                        <span className="text-[10px] font-bold text-[#718096] uppercase tracking-widest bg-[#F9F7F2] px-3 py-1 rounded-full">
                          Target: {new Date(milestone.targetDate).toLocaleDateString()}
                        </span>
                      )}
                      <button 
                        onClick={() => deleteMilestone(milestone.milestoneId)}
                        className="p-2 text-[#718096] hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[#718096] font-medium">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <h3 className="text-xl font-lexend font-bold text-[#2D3748] flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-[#2D34FB]" />
            Yield Projections
          </h3>
          <div className="bg-[#2D3748] rounded-[40px] p-8 text-white space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Briefcase className="w-32 h-32" />
            </div>
            
            <div className="space-y-6 relative">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Monthly Net Run Rate</p>
                <p className="text-4xl font-lexend font-bold">
                  ${(ehr * 160 || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Weekly Capacity</p>
                  <p className="text-xl font-lexend font-bold">40.0h</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Efficiency</p>
                  <p className="text-xl font-lexend font-bold">92%</p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-4">
                <p className="text-xs font-medium text-white/60">
                  Your current Effective Hourly Rate is derived from {shifts.length} operational shifts. 
                  Increasing your EHR by $5.00 would result in an additional $800/mo net yield.
                </p>
                <button className="w-full bg-[#2D34FB] text-white py-3 rounded-xl font-lexend font-bold text-sm hover:bg-[#1A23D6] transition-all flex items-center justify-center gap-2">
                  Optimization Insights
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
