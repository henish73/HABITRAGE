import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Save, Loader2, Plus, Briefcase, Trash2, Settings2, Calculator, Percent, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { EmployerConfig, Role, CustomDeduction, PayCycle, DeductionType } from '../types';

interface EmployerSettingsModalProps {
  userId: string;
  employers: EmployerConfig[];
  onClose: () => void;
}

export const EmployerSettingsModal: React.FC<EmployerSettingsModalProps> = ({ userId, employers, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [editingEmployer, setEditingEmployer] = useState<Partial<EmployerConfig> | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSave = async (employer: Partial<EmployerConfig>) => {
    setLoading(true);
    try {
      const employerId = employer.employerId || crypto.randomUUID();
      const finalEmployer: EmployerConfig = {
        employerId,
        name: employer.name || 'New Employer',
        payCycle: employer.payCycle || 'bi_weekly',
        payPeriodAnchorDate: employer.payPeriodAnchorDate || new Date().toISOString().split('T')[0],
        roles: employer.roles || [],
        taxProfile: employer.taxProfile || {
          federalClaimAmount: 16452,
          provincialClaimAmount: 12989,
          cppExemptionEnabled: true,
          eiRatePct: 1.63,
        },
        customDeductions: employer.customDeductions || [],
        vacationAccrualPct: employer.vacationAccrualPct || 4,
        color: employer.color || '#2D34FB'
      };

      await setDoc(doc(db, `users/${userId}/employers/${employerId}`), finalEmployer);
      setEditingEmployer(null);
    } catch (err) {
      console.error("Save employer error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (employerId: string) => {
    const employer = employers.find(e => e.employerId === employerId);
    const employerName = employer?.name || 'this employer';

    try {
      await deleteDoc(doc(db, `users/${userId}/employers/${employerId}`));
      setNotification({ message: `${employerName} deleted successfully.`, type: 'success' });
    } catch (err: any) {
      console.error("Delete employer error:", err);
      setNotification({ message: `Failed to delete: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[250] p-6">
      <div className="absolute inset-0 bg-[#2D3748]/40 backdrop-blur-md" onClick={onClose} />
      
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

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-[48px] p-10 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h3 className="text-3xl font-lexend font-bold text-[#2D3748]">Employer Architecture</h3>
            <p className="text-[#718096] text-sm font-medium">Configure payroll engines for each of your income streams.</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-3 hover:bg-[#F9F7F2] rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-[#718096]" />
          </button>
        </div>

        {editingEmployer ? (
          <EmployerForm 
            employer={editingEmployer} 
            onSave={handleSave} 
            onCancel={() => setEditingEmployer(null)}
            loading={loading}
          />
        ) : (
          <div className="space-y-6">
            <button 
              type="button"
              onClick={() => setEditingEmployer({})}
              className="w-full border-2 border-dashed border-[#E2E8F0] rounded-3xl py-8 flex flex-col items-center justify-center gap-3 text-[#718096] hover:border-[#2D34FB] hover:text-[#2D34FB] transition-all"
            >
              <Plus className="w-8 h-8" />
              <span className="font-lexend font-bold uppercase tracking-widest text-xs">Deploy New Employer Config</span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employers.map(employer => (
                <div key={employer.employerId} className="p-6 bg-[#F9F7F2] border border-[#E2E8F0] rounded-[32px] hover:border-[#2D34FB]/30 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: employer.color + '20', color: employer.color }}>
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-lexend font-bold text-[#2D3748] text-lg">{employer.name}</h4>
                        <p className="text-xs font-bold text-[#718096] uppercase tracking-widest">{employer.payCycle.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        type="button"
                        onClick={() => setEditingEmployer(employer)} 
                        className="p-2 bg-white rounded-xl shadow-sm hover:text-[#2D34FB]"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDelete(employer.employerId)} 
                        className="p-2 bg-white rounded-xl shadow-sm hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-[#718096] uppercase tracking-tighter">
                    <div className="bg-white/50 p-2 rounded-lg">Roles: {employer.roles.length}</div>
                    <div className="bg-white/50 p-2 rounded-lg">Pay Cycle: {employer.payCycle.replace('_', ' ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const EmployerForm: React.FC<{
  employer: Partial<EmployerConfig>;
  onSave: (employer: Partial<EmployerConfig>) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ employer, onSave, onCancel, loading }) => {
  const [formData, setFormData] = useState<Partial<EmployerConfig>>({
    ...employer,
    roles: employer.roles || [],
    customDeductions: employer.customDeductions || [],
    taxProfile: employer.taxProfile || {
      federalClaimAmount: 16452,
      provincialClaimAmount: 12989,
      cppExemptionEnabled: true,
      eiRatePct: 1.63,
    }
  });

  const [newRole, setNewRole] = useState({ roleName: '', hourlyRate: 25 });
  const [newDeduction, setNewDeduction] = useState<Partial<CustomDeduction>>({ name: '', type: 'fixed_per_paycheck', value: 0 });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#718096] ml-2">Employer Name</label>
          <input 
            type="text"
            value={formData.name || ''}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
            placeholder="e.g., Starbucks, Hospital, Freelance"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#718096] ml-2">Pay Cycle</label>
          <select 
            value={formData.payCycle || 'bi_weekly'}
            onChange={e => setFormData({ ...formData, payCycle: e.target.value as PayCycle })}
            className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
          >
            <option value="weekly">Weekly (52/yr)</option>
            <option value="bi_weekly">Bi-Weekly (26/yr)</option>
            <option value="semi_monthly">Semi-Monthly (24/yr)</option>
            <option value="monthly">Monthly (12/yr)</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#718096] ml-2">Pay Period Anchor (Start Date)</label>
          <input 
            type="date"
            value={formData.payPeriodAnchorDate || ''}
            onChange={e => setFormData({ ...formData, payPeriodAnchorDate: e.target.value })}
            className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
          />
          <p className="text-[10px] text-[#718096] px-2">Used to calculate bi-weekly cycles accurately.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Roles Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">
            <Calculator className="w-3.5 h-3.5 text-[#2D34FB]" />
            Roles & Rates
          </div>
          <div className="p-6 bg-[#F9F7F2] rounded-[32px] border border-[#E2E8F0] space-y-4">
            <div className="flex gap-2">
              <input 
                type="text" placeholder="Role"
                value={newRole.roleName}
                onChange={e => setNewRole({ ...newRole, roleName: e.target.value })}
                className="flex-1 bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 text-sm"
              />
              <input 
                type="number" placeholder="$"
                value={newRole.hourlyRate}
                onChange={e => setNewRole({ ...newRole, hourlyRate: Number(e.target.value) })}
                className="w-20 bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 text-sm"
              />
              <button 
                type="button"
                onClick={() => {
                  if (!newRole.roleName) return;
                  setFormData({ ...formData, roles: [...(formData.roles || []), { roleId: crypto.randomUUID(), ...newRole }] });
                  setNewRole({ roleName: '', hourlyRate: 25 });
                }}
                className="p-2 bg-[#2D34FB] text-white rounded-xl"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {formData.roles?.map(role => (
                <div key={role.roleId} className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#E2E8F0]">
                  <span className="text-sm font-bold text-[#2D3748]">{role.roleName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#718096]">${role.hourlyRate}/hr</span>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, roles: formData.roles?.filter(r => r.roleId !== role.roleId) })}
                      className="text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tax Profile Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5 text-[#2D34FB]" />
            Tax & Compliance
          </div>
          <div className="p-6 bg-[#F9F7F2] rounded-[32px] border border-[#E2E8F0] space-y-4">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-2">
              <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Ontario Payroll Engine</p>
              <p className="text-xs text-blue-800 leading-tight">Tax, CPP, and EI are calculated automatically using current Ontario statutory brackets.</p>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-[#718096] uppercase">CPP Exemption ($3500)</label>
              <input 
                type="checkbox"
                checked={formData.taxProfile?.cppExemptionEnabled}
                onChange={e => setFormData({ ...formData, taxProfile: { ...formData.taxProfile!, cppExemptionEnabled: e.target.checked } })}
                className="w-5 h-5 rounded border-[#E2E8F0] text-[#2D34FB]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#718096] uppercase">Vacation Accrual (%)</label>
              <input 
                type="number"
                value={formData.vacationAccrualPct}
                onChange={e => setFormData({ ...formData, vacationAccrualPct: Number(e.target.value) })}
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 rounded-2xl font-lexend font-bold text-[#718096] bg-[#F9F7F2] hover:bg-[#E2E8F0] transition-all"
        >
          Cancel
        </button>
        <button 
          type="button"
          onClick={() => onSave(formData)}
          disabled={loading}
          className="flex-[2] bg-[#2D34FB] text-white py-4 rounded-2xl font-lexend font-bold shadow-xl shadow-[#2D34FB]/20 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Commit Configuration
        </button>
      </div>
    </div>
  );
};
