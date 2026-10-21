import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  DollarSign, 
  Briefcase, 
  Plus, 
  TrendingUp, 
  Calculator,
  ChevronRight,
  Shield,
  X,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Receipt,
  Copy,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { db } from '../lib/firebase';
import { setDoc, doc, deleteDoc } from 'firebase/firestore';
import { Shift, EmployerConfig } from '../types';
import { calculatePayroll, PayStubPreview } from '../lib/payrollEngine';
import { syncShiftToGoogle } from '../lib/gcalSync';
import { getPayPeriodRange, formatPayPeriod } from '../lib/dateUtils';

interface ShiftPredictorProps {
  userId: string;
  shifts: Shift[];
  employers: EmployerConfig[];
  googleAccessToken: string | null;
  initialDate?: string | null;
  onClose?: () => void;
  forceOpen?: boolean;
  modalOnly?: boolean;
}

export const ShiftPredictor: React.FC<ShiftPredictorProps> = ({ 
  userId, 
  shifts, 
  employers, 
  googleAccessToken,
  initialDate,
  onClose,
  forceOpen = false,
  modalOnly = false
}) => {
  const [showAddShift, setShowAddShift] = useState(forceOpen);
  const [showPreview, setShowPreview] = useState<PayStubPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const [newShift, setNewShift] = useState({
    employerId: '',
    roleId: '',
    shiftDate: initialDate || new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '16:00',
    scheduledHours: 7,
    breakMinutes: 30,
    hourlyRateOverride: 0,
  });

  const resetForm = () => {
    setNewShift({
      employerId: '',
      roleId: '',
      shiftDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '16:00',
      scheduledHours: 7,
      breakMinutes: 30,
      hourlyRateOverride: 0,
    });
  };

  React.useEffect(() => {
    if (initialDate) {
      resetForm();
      setNewShift(prev => ({ ...prev, shiftDate: initialDate }));
      setShowAddShift(true);
    }
  }, [initialDate]);

  const handleClose = () => {
    setShowAddShift(false);
    resetForm();
    onClose?.();
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!userId) {
      setNotification({ message: "System Error: User ID not found.", type: 'error' });
      return;
    }
    if (!shiftId) {
      setNotification({ message: "Error: Shift ID missing.", type: 'error' });
      return;
    }
    
    const shiftToDelete = shifts.find(s => s.shiftId === shiftId);
    if (!shiftToDelete) {
      setNotification({ message: "Error: Shift record not found in memory.", type: 'error' });
      return;
    }

    const shiftDesc = `${shiftToDelete.shiftDate}`;

    setNotification({ message: `Deleting shift on ${shiftDesc}...`, type: 'success' });
    
    try {
      await deleteDoc(doc(db, `users/${userId}/shifts/${shiftId}`));
      setNotification({ message: `Successfully deleted shift on ${shiftDesc}`, type: 'success' });
    } catch (err: any) {
      console.error("Delete shift error:", err);
      setNotification({ 
        message: `Failed to delete: ${err.message || "Unknown error"}`, 
        type: 'error' 
      });
    }
  };

  const sortedShifts = useMemo(() => {
    return [...shifts].sort((a, b) => (b.shiftDate || '').localeCompare(a.shiftDate || ''));
  }, [shifts]);

  const handleDuplicateShift = (shift: Shift) => {
    setNewShift({
      employerId: shift.employerId,
      roleId: shift.roleId,
      shiftDate: shift.shiftDate, // Keep original date instead of today
      startTime: shift.startTime,
      endTime: shift.endTime,
      scheduledHours: shift.scheduledHours,
      breakMinutes: shift.breakMinutes || 0,
      hourlyRateOverride: shift.hourlyRateOverride || 0,
    });
    setShowAddShift(true);
  };

  // Automatically calculate hours when times change
  const calculateDuration = (start: string, end: string, breakMins: number = 0) => {
    if (!start || !end) return 0;
    const sParts = start.split(':');
    const eParts = end.split(':');
    if (sParts.length !== 2 || eParts.length !== 2) return 0;

    const sH = Number(sParts[0]);
    const sM = Number(sParts[1]);
    const eH = Number(eParts[0]);
    const eM = Number(eParts[1]);

    if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 0;

    let diff = (eH + eM / 60) - (sH + sM / 60);
    if (diff < 0) diff += 24; // Handle overnight shifts
    
    const netHours = diff - (breakMins / 60);
    return parseFloat(netHours.toFixed(2)) || 0;
  };

  const handleTimeChange = (field: 'startTime' | 'endTime' | 'breakMinutes', value: string | number) => {
    const updated = { ...newShift, [field]: value };
    const hours = calculateDuration(updated.startTime, updated.endTime, Number(updated.breakMinutes));
    setNewShift({ ...updated, scheduledHours: hours || 0 });
  };

  const selectedEmployer = employers.find(e => e.employerId === newShift.employerId);
  const selectedRole = selectedEmployer?.roles.find(r => r.roleId === newShift.roleId);

  const stats = useMemo(() => {
    const totalGross = shifts.reduce((sum, s) => sum + (s.grossEstimatedPay || 0), 0);
    const totalNet = shifts.reduce((sum, s) => sum + (s.netEstimatedPay || 0), 0);
    const totalHours = shifts.reduce((sum, s) => sum + s.scheduledHours, 0);
    return { totalGross, totalNet, totalHours };
  }, [shifts]);

  const realTimePayroll = useMemo(() => {
    if (!selectedEmployer || !newShift.scheduledHours || isNaN(newShift.scheduledHours)) return null;
    
    // To get a realistic tax projection, we include existing shifts for this employer in the current period
    // Or at least we should avoid projecting based on ONLY one shift if they have many.
    // However, for simplicity and "Yield" per shift, we can stick to single-shift projection 
    // BUT we should maybe allow the user to see "Marginal" vs "Average" tax.
    // For now, let's keep it as is but ensure it's calculated correctly.
    
    // To get a realistic tax projection, we include existing shifts for this employer
    const employerShifts = shifts.filter(s => s.employerId === newShift.employerId);
    
    const tempShift: Shift = {
      shiftId: 'temp',
      employerId: newShift.employerId,
      roleId: newShift.roleId,
      shiftDate: newShift.shiftDate,
      startTime: newShift.startTime,
      endTime: newShift.endTime,
      scheduledHours: newShift.scheduledHours,
      hourlyRateOverride: newShift.hourlyRateOverride || 0,
      netEstimatedPay: 0,
      grossEstimatedPay: 0,
      status: 'scheduled'
    };

    const allShifts = [...employerShifts, tempShift];
    const fullPayroll = calculatePayroll(allShifts, selectedEmployer);
    const existingPayroll = calculatePayroll(employerShifts, selectedEmployer);

    // We return the marginal impact of this shift
    return {
      ...fullPayroll,
      basicGross: fullPayroll.basicGross - existingPayroll.basicGross,
      grossPay: fullPayroll.grossPay - existingPayroll.grossPay,
      vacationPay: fullPayroll.vacationPay - existingPayroll.vacationPay,
      cppDeduction: fullPayroll.cppDeduction - existingPayroll.cppDeduction,
      eiDeduction: fullPayroll.eiDeduction - existingPayroll.eiDeduction,
      incomeTax: fullPayroll.incomeTax - existingPayroll.incomeTax,
      totalDeductions: fullPayroll.totalDeductions - existingPayroll.totalDeductions,
      netPay: fullPayroll.netPay - existingPayroll.netPay,
    };
  }, [newShift, selectedEmployer, shifts]);

  const handleAddShiftClick = () => {
    resetForm();
    setShowAddShift(true);
  };

  const handleAddShift = async () => {
    if (!selectedEmployer || !newShift.employerId) return;
    setLoading(true);
    try {
      const payroll = realTimePayroll;
      if (!payroll) return;

      const shiftId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `shift_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const shift: Shift = {
        shiftId,
        employerId: newShift.employerId,
        roleId: newShift.roleId,
        shiftDate: newShift.shiftDate,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
        scheduledHours: newShift.scheduledHours || 0,
        breakMinutes: newShift.breakMinutes || 0,
        hourlyRateOverride: newShift.hourlyRateOverride || 0,
        netEstimatedPay: payroll.netPay,
        grossEstimatedPay: payroll.grossPay,
        status: 'scheduled'
      };

      await setDoc(doc(db, `users/${userId}/shifts/${shiftId}`), shift);

      if (syncToCalendar && googleAccessToken) {
        await syncShiftToGoogle(googleAccessToken, shift, selectedEmployer.name);
      }

      handleClose();
      resetForm();
    } catch (err) {
      console.error("Add shift error:", err);
    } finally {
      setLoading(false);
    }
  };

  const payPeriods = useMemo(() => {
    const grouped: Record<string, { shifts: Shift[]; range: string; employer: EmployerConfig }> = {};
    
    shifts.forEach(s => {
      const employer = employers.find(e => e.employerId === s.employerId);
      if (!employer) return;

      const date = new Date(s.shiftDate + 'T12:00:00'); // Use mid-day to avoid TZ issues
      const { start, end } = getPayPeriodRange(date, employer.payPeriodAnchorDate, employer.payCycle);
      const rangeStr = formatPayPeriod(start, end);
      
      const key = `${s.employerId}_${start.toISOString().split('T')[0]}`;
      if (!grouped[key]) {
        grouped[key] = { shifts: [], range: rangeStr, employer };
      }
      grouped[key].shifts.push(s);
    });
    
    // Sort by start date descending
    return Object.entries(grouped).sort((a, b) => b[0].split('_')[1].localeCompare(a[0].split('_')[1]));
  }, [shifts, employers]);

  return (
    <div className="space-y-12 relative">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-8 left-1/2 z-[300] px-6 py-3 rounded-2xl shadow-xl font-lexend font-bold text-sm flex items-center gap-3 ${
              notification.type === 'success' ? 'bg-[#8DAA91] text-white' : 'bg-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {!modalOnly && (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white border border-[#E2E8F0] rounded-[40px] p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-[#2D34FB]/5 rounded-2xl text-[#2D34FB]">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Projected Net</span>
          </div>
          <h4 className="text-4xl font-lexend font-bold text-[#2D3748]">
            ${(stats.totalNet || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h4>
          <p className="text-xs text-[#718096]">Estimated take-home after tax.</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[40px] p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-[#8DAA91]/5 rounded-2xl text-[#8DAA91]">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Logged Capacity</span>
          </div>
          <h4 className="text-4xl font-lexend font-bold text-[#2D3748]">
            {stats.totalHours} hrs
          </h4>
          <p className="text-xs text-[#718096]">Total deployment time this cycle.</p>
        </div>

        <div className="bg-[#2D3748] rounded-[40px] p-8 space-y-4 text-white">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-white/10 rounded-2xl text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-lexend font-bold text-white/50 uppercase tracking-widest">Gross Yield</span>
          </div>
          <h4 className="text-4xl font-lexend font-bold text-white">
            ${(stats.totalHours > 0 ? stats.totalGross / stats.totalHours : 0).toFixed(2)}<span className="text-lg text-white/40 ml-1">/hr</span>
          </h4>
          <p className="text-xs text-white/40">Gross yield per deployed hour.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-lexend font-bold text-[#2D3748]">Deployment Log</h3>
            <button 
              type="button"
              onClick={handleAddShiftClick}
              className="bg-[#2D34FB] text-white px-6 py-3 rounded-2xl font-lexend font-bold text-sm shadow-xl shadow-[#2D34FB]/20 hover:scale-105 transition-all"
            >
              Log Shift
            </button>
          </div>

          <div className="space-y-4">
            {sortedShifts.length === 0 ? (
              <div className="bg-white border border-dashed border-[#E2E8F0] rounded-[32px] p-20 text-center space-y-3">
                <Shield className="w-12 h-12 text-[#E2E8F0] mx-auto" />
                <p className="text-[#718096] font-medium">No shifts logged in the current deployment.</p>
              </div>
            ) : (
              sortedShifts.map((shift) => {
                const employer = employers.find(e => e.employerId === shift.employerId);
                return (
                  <div key={shift.shiftId} className="bg-white border border-[#E2E8F0] rounded-[32px] p-6 flex items-center justify-between hover:border-[#2D34FB]/20 transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-[#F9F7F2] rounded-2xl flex flex-col items-center justify-center">
                        <span className="text-[10px] font-lexend font-bold text-[#718096] uppercase">{new Date(shift.shiftDate).toLocaleDateString(undefined, { month: 'short' })}</span>
                        <span className="text-xl font-lexend font-bold text-[#2D3748] leading-none">{new Date(shift.shiftDate).toLocaleDateString(undefined, { day: 'numeric' })}</span>
                      </div>
                      <div>
                        <h5 className="font-lexend font-bold text-[#2D3748]">{employer?.name || 'Unknown'}</h5>
                        <p className="text-sm text-[#718096]">
                          {shift.startTime} - {shift.endTime} ({shift.scheduledHours} hrs)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right mr-4">
                        <div className="text-xl font-lexend font-bold text-[#2D34FB]">+${shift.netEstimatedPay.toFixed(2)}</div>
                        <div className="text-[10px] font-lexend font-bold text-[#8DAA91] uppercase tracking-widest">Est. Net Pay</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleDuplicateShift(shift)}
                          className="p-2 hover:bg-[#F9F7F2] rounded-xl text-[#718096] hover:text-[#2D34FB] transition-colors"
                          title="Duplicate Shift"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteShift(shift.shiftId)}
                          className="p-2 hover:bg-[#F9F7F2] rounded-xl text-[#718096] hover:text-red-500 transition-colors"
                          title="Delete Shift"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-lexend font-bold text-[#2D3748]">Payroll Forecaster</h3>
          <div className="space-y-4">
            {payPeriods.map(([key, data]) => {
              const { shifts: periodShifts, range, employer } = data;
              const payroll = calculatePayroll(periodShifts, employer);

              return (
                <div key={key} className="bg-white border border-[#E2E8F0] rounded-[40px] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-lexend font-bold text-[#2D3748]">{employer.name}</h4>
                      <p className="text-[10px] font-bold text-[#718096] uppercase tracking-widest">{range}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowPreview(payroll)}
                      className="p-3 bg-[#F9F7F2] rounded-2xl text-[#2D34FB] hover:scale-105 transition-all"
                    >
                      <Receipt className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="pt-4 border-t border-[#F9F7F2] space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-lexend font-bold text-[#2D3748]">Net Total</span>
                      <span className="text-2xl font-lexend font-bold text-[#2D34FB]">${payroll.netPay.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  )}

      {/* Add Shift Modal */}
      <AnimatePresence>
        {showAddShift && (
          <div className="fixed inset-0 flex items-center justify-center z-[250] p-6">
            <div className="absolute inset-0 bg-[#2D3748]/40 backdrop-blur-md" onClick={handleClose} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[48px] p-10 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-lexend font-bold text-[#2D3748]">Shift Deployment</h3>
                <button onClick={handleClose} className="p-3 hover:bg-[#F9F7F2] rounded-full transition-colors">
                  <X className="w-6 h-6 text-[#718096]" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#718096] ml-2">Target Employer</label>
                  <select 
                    value={newShift.employerId}
                    onChange={e => setNewShift({ ...newShift, employerId: e.target.value, roleId: '' })}
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                  >
                    <option value="">Select Employer</option>
                    {employers.map(e => (
                      <option key={e.employerId} value={e.employerId}>{e.name}</option>
                    ))}
                  </select>
                </div>

                {selectedEmployer && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#718096] ml-2">Active Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedEmployer.roles.map(role => (
                        <button
                          type="button"
                          key={role.roleId}
                          onClick={() => setNewShift({ ...newShift, roleId: role.roleId })}
                          className={`p-4 rounded-2xl border text-left transition-all ${newShift.roleId === role.roleId ? 'border-[#2D34FB] bg-[#2D34FB]/5 ring-1 ring-[#2D34FB]' : 'border-[#E2E8F0] hover:border-[#2D34FB]/30'}`}
                        >
                          <div className="font-bold text-[#2D3748] text-sm">{role.roleName}</div>
                          <div className="text-xs text-[#718096]">${role.hourlyRate}/hr</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#718096] ml-2">Start Time</label>
                    <input 
                      type="time" 
                      value={newShift.startTime}
                      onChange={e => handleTimeChange('startTime', e.target.value)}
                      className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-4 py-4 font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#718096] ml-2">End Time</label>
                    <input 
                      type="time" 
                      value={newShift.endTime}
                      onChange={e => handleTimeChange('endTime', e.target.value)}
                      className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-4 py-4 font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#718096] ml-2">Break (Mins)</label>
                    <input 
                      type="number" 
                      value={newShift.breakMinutes}
                      onChange={e => handleTimeChange('breakMinutes', parseInt(e.target.value) || 0)}
                      className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-4 py-4 font-medium text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#718096] ml-2">Shift Date</label>
                    <input 
                      type="date" 
                      value={newShift.shiftDate}
                      onChange={e => setNewShift({ ...newShift, shiftDate: e.target.value })}
                      className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#718096] ml-2">Net Work Hours</label>
                    <input 
                      type="number" 
                      value={isNaN(newShift.scheduledHours) ? '' : newShift.scheduledHours}
                      onChange={e => setNewShift({ ...newShift, scheduledHours: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                    />
                  </div>
                </div>

                {realTimePayroll && (
                  <div className="bg-[#2D34FB]/5 p-6 rounded-3xl border border-[#2D34FB]/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#2D34FB]">
                        <Calculator className="w-5 h-5" />
                        <span className="font-lexend font-bold text-sm">Real-time Yield</span>
                      </div>
                      <span className="text-2xl font-lexend font-bold text-[#2D34FB]">+${realTimePayroll.netPay.toFixed(2)}</span>
                    </div>
                    
                    <div className="pt-4 border-t border-[#2D34FB]/10 space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-[#718096] uppercase tracking-widest">
                        <span>Base Pay ({newShift.scheduledHours}h)</span>
                        <span>${realTimePayroll.basicGross.toFixed(2)}</span>
                      </div>
                      {realTimePayroll.vacationPay > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                          <span>Vacation Accrual ({selectedEmployer?.vacationAccrualPct}%)</span>
                          <span>+${realTimePayroll.vacationPay.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[10px] font-bold text-red-500 uppercase tracking-widest">
                        <span>Statutory Deductions (Tax/CPP/EI)</span>
                        <span>-${realTimePayroll.totalDeductions.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {googleAccessToken && (
                  <label className="flex items-center gap-4 p-4 bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl cursor-pointer hover:border-[#2D34FB]/30 transition-all">
                    <input 
                      type="checkbox"
                      checked={syncToCalendar}
                      onChange={e => setSyncToCalendar(e.target.checked)}
                      className="w-5 h-5 rounded-lg border-[#E2E8F0] text-[#2D34FB]"
                    />
                    <div className="flex items-center gap-3">
                      <RefreshCw className={`w-5 h-5 ${syncToCalendar ? 'text-[#2D34FB]' : 'text-[#718096]'}`} />
                      <span className="text-sm font-lexend font-bold text-[#2D3748]">Sync to Google Calendar</span>
                    </div>
                  </label>
                )}

                <button 
                  type="button"
                  onClick={handleAddShift}
                  disabled={loading || !newShift.employerId || !newShift.roleId}
                  className="w-full bg-[#2D34FB] text-white py-5 rounded-[24px] font-lexend font-bold shadow-2xl shadow-[#2D34FB]/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                    <>
                      <CheckCircle2 className="w-6 h-6" />
                      Commit Shift
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Pay Stub Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 flex items-center justify-center z-[250] p-6">
            <div className="absolute inset-0 bg-[#2D3748]/40 backdrop-blur-md" onClick={() => setShowPreview(null)} />
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="relative bg-white rounded-[48px] p-10 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3 text-[#2D34FB]">
                  <Receipt className="w-8 h-8" />
                  <h3 className="text-2xl font-lexend font-bold text-[#2D3748]">Pay Stub Preview</h3>
                </div>
                <button onClick={() => setShowPreview(null)} className="p-2 hover:bg-[#F9F7F2] rounded-full">
                  <X className="w-6 h-6 text-[#718096]" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#718096] font-medium">Base Earnings</span>
                    <span className="font-bold text-[#2D3748]">${showPreview.basicGross.toFixed(2)}</span>
                  </div>
                  {showPreview.vacationPay > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#718096] font-medium">Vacation Pay</span>
                      <span className="font-bold text-emerald-600">+${showPreview.vacationPay.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-[#F9F7F2]">
                    <span className="text-[#2D3748] font-bold">Total Gross</span>
                    <span className="font-extrabold text-[#2D3748]">${showPreview.grossPay.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-[#F9F7F2]">
                  <p className="text-[10px] font-bold text-[#A0AEC0] uppercase tracking-widest mb-2">Statutory Deductions</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#718096]">CPP / Pension</span>
                    <span className="font-bold text-red-500">-${showPreview.cppDeduction.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#718096]">Employment Insurance</span>
                    <span className="font-bold text-red-500">-${showPreview.eiDeduction.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#718096]">Income Tax Estimate</span>
                    <span className="font-bold text-red-500">-${showPreview.incomeTax.toFixed(2)}</span>
                  </div>
                </div>

                {showPreview.customDeductions.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-[#F9F7F2]">
                    <p className="text-[10px] font-bold text-[#A0AEC0] uppercase tracking-widest mb-2">Non-Statutory Deductions</p>
                    {showPreview.customDeductions.map((d, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-[#718096]">{d.name}</span>
                        <span className="font-bold text-red-500">-${d.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-8 bg-[#2D34FB] p-8 rounded-3xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <DollarSign className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-[10px] font-lexend font-bold text-white/60 uppercase tracking-widest mb-1">Net Direct Deposit</p>
                  <div className="text-4xl font-lexend font-bold text-white">${showPreview.netPay.toFixed(2)}</div>
                </div>

                <button 
                  onClick={() => setShowPreview(null)}
                  className="w-full py-4 text-[#2D34FB] font-lexend font-bold hover:bg-[#2D34FB]/5 rounded-2xl transition-all"
                >
                  Close Document
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
