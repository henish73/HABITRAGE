import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Building2, CreditCard, Landmark, Save, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { setDoc, doc, deleteDoc } from 'firebase/firestore';
import { Account } from '../types';

interface EditAccountModalProps {
  userId: string;
  account: Account;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({ userId, account, onClose, onSuccess }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<Account>({ ...account });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, `users/${userId}/accounts/${account.accountId}`), formData);
      onSuccess("Account parameters recalibrated.");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, `users/${userId}/accounts/${account.accountId}`));
      onSuccess("Capital node decommissioned.");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[300] p-6">
      <div className="absolute inset-0 bg-[#2D3748]/40 backdrop-blur-md" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-xl bg-white rounded-[48px] p-12 shadow-2xl border border-[#E2E8F0] overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#2D34FB]/5 rounded-2xl flex items-center justify-center">
              {formData.type === 'credit_card' ? <CreditCard className="w-7 h-7 text-[#2D34FB]" /> : <Landmark className="w-7 h-7 text-[#2D34FB]" />}
            </div>
            <div>
              <h2 className="font-lexend text-3xl font-bold">Edit Account</h2>
              <p className="text-[#718096] font-medium">Recalibrate capital node parameters</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#718096] hover:text-[#2D3748] transition-colors p-2">
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest ml-2">Account Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest ml-2">Institution</label>
              <input 
                type="text" 
                value={formData.institution}
                onChange={(e) => setFormData({...formData, institution: e.target.value})}
                className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest ml-2">Starting Balance ($)</label>
            <input 
              type="number" 
              value={formData.startingBalance || 0}
              onChange={(e) => setFormData({...formData, startingBalance: Number(e.target.value)})}
              className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 text-2xl font-lexend font-bold"
            />
          </div>

          {formData.type === 'credit_card' && (
            <div className="space-y-6 pt-4 border-t border-[#F1F5F9]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest ml-2">Credit Limit ($)</label>
                  <input 
                    type="number" 
                    value={formData.creditLimit || 0}
                    onChange={(e) => setFormData({...formData, creditLimit: Number(e.target.value)})}
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest ml-2">APR (%)</label>
                  <input 
                    type="number" 
                    value={formData.aprPercentage || 0}
                    onChange={(e) => setFormData({...formData, aprPercentage: Number(e.target.value)})}
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest ml-2">Min. Payment ($)</label>
                  <input 
                    type="number" 
                    value={formData.minimumPayment || 0}
                    onChange={(e) => setFormData({...formData, minimumPayment: Number(e.target.value)})}
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest ml-2">Installments</label>
                  <input 
                    type="number" 
                    value={formData.activeInstallments || 0}
                    onChange={(e) => setFormData({...formData, activeInstallments: Number(e.target.value)})}
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest ml-2">Due Date</label>
                  <input 
                    type="date" 
                    value={formData.dueDate || ''}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest ml-2">Closing Day (1-31)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="31"
                    value={formData.statementClosingDay || 1}
                    onChange={(e) => setFormData({...formData, statementClosingDay: Number(e.target.value)})}
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest ml-2">Last Statement Balance ($)</label>
                <input 
                  type="number" 
                  value={formData.lastStatementBalance || 0}
                  onChange={(e) => setFormData({...formData, lastStatementBalance: Number(e.target.value)})}
                  className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-8">
            <button
              onClick={handleSave}
              disabled={isSaving || isDeleting || !formData.name}
              className="w-full bg-[#2D34FB] text-white font-lexend font-bold py-5 rounded-3xl shadow-xl shadow-[#2D34FB]/20 flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Changes
            </button>
            <button
              onClick={handleDelete}
              disabled={isSaving || isDeleting}
              className="w-full bg-red-50 text-red-500 font-lexend font-bold py-5 rounded-3xl flex items-center justify-center gap-3 hover:bg-red-100 transition-all"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Delete Account
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
