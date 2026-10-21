import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Building2, CreditCard, Landmark, DollarSign, Plus } from 'lucide-react';
import { db } from '../lib/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { Account } from '../types';

interface AddAccountModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ userId, onClose, onSuccess }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [account, setAccount] = useState<Partial<Account>>({
    name: '',
    institution: '',
    type: 'bank_checking',
    startingBalance: 0,
    creditLimit: 0,
    aprPercentage: 0,
    statementClosingDay: 1,
    dueDate: '',
    minimumPayment: 0,
    lastStatementBalance: 0,
    activeInstallments: 0
  });

  const handleSave = async () => {
    setIsSaving(true);
    const accountId = crypto.randomUUID();
    const isCredit = account.type === 'credit_card';
    const finalAccount: Account = {
      accountId,
      name: account.name || 'Unnamed Account',
      institution: account.institution || 'Unknown Institution',
      type: account.type as any,
      startingBalance: Number(account.startingBalance) || 0,
      principalBalance: 0, // Legacy field, keeping as 0
      creditLimit: isCredit ? Number(account.creditLimit) : undefined,
      aprPercentage: isCredit ? Number(account.aprPercentage) : undefined,
      statementClosingDay: isCredit ? Number(account.statementClosingDay) : undefined,
      dueDate: isCredit ? account.dueDate : undefined,
      minimumPayment: isCredit ? Number(account.minimumPayment) : undefined,
      lastStatementBalance: isCredit ? Number(account.lastStatementBalance) : undefined,
      activeInstallments: isCredit ? Number(account.activeInstallments) : undefined,
    };

    try {
      await setDoc(doc(db, `users/${userId}/accounts/${accountId}`), finalAccount);
      onSuccess("Account successfully linked to the mesh.");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[300] p-6">
      <div className="absolute inset-0 bg-[#2D3748]/40 backdrop-blur-md" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-xl bg-white rounded-[48px] p-12 shadow-2xl border border-[#E2E8F0]"
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#2D34FB]/5 rounded-2xl flex items-center justify-center">
              <Landmark className="w-7 h-7 text-[#2D34FB]" />
            </div>
            <div>
              <h2 className="font-lexend text-3xl font-bold">Link Account</h2>
              <p className="text-[#718096] font-medium">Add a new node to your capital mesh</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#718096] hover:text-[#2D3748] transition-colors p-2">
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Account Name</label>
              <input 
                type="text" 
                value={account.name}
                onChange={(e) => setAccount({...account, name: e.target.value})}
                className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                placeholder="e.g. Daily Checking"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Institution</label>
              <input 
                type="text" 
                value={account.institution}
                onChange={(e) => setAccount({...account, institution: e.target.value})}
                className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                placeholder="e.g. Chase"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest text-center block mb-4">Account Type</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'bank_checking', label: 'Checking', icon: Landmark },
                { id: 'savings', label: 'Savings', icon: Building2 },
                { id: 'credit_card', label: 'Credit', icon: CreditCard }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setAccount({...account, type: t.id as any})}
                  className={`flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all ${
                    account.type === t.id 
                      ? 'border-[#2D34FB] bg-[#2D34FB]/5 text-[#2D34FB]' 
                      : 'border-[#E2E8F0] text-[#718096] hover:border-[#2D34FB]/20'
                  }`}
                >
                  <t.icon className="w-6 h-6" />
                  <span className="text-[10px] font-lexend font-bold uppercase tracking-widest">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Starting Balance ($)</label>
            <input 
              type="number" 
              value={account.startingBalance || 0}
              onChange={(e) => setAccount({...account, startingBalance: Number(e.target.value)})}
              className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 text-2xl font-lexend font-bold"
            />
          </div>

          {account.type === 'credit_card' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Credit Limit ($)</label>
                  <input 
                    type="number" 
                    value={account.creditLimit}
                    onChange={(e) => setAccount({...account, creditLimit: Number(e.target.value)})}
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">APR (%)</label>
                  <input 
                    type="number" 
                    value={account.aprPercentage}
                    onChange={(e) => setAccount({...account, aprPercentage: Number(e.target.value)})}
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Min. Payment ($)</label>
                  <input 
                    type="number" 
                    value={account.minimumPayment}
                    onChange={(e) => setAccount({...account, minimumPayment: Number(e.target.value)})}
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Installments</label>
                  <input 
                    type="number" 
                    value={account.activeInstallments}
                    onChange={(e) => setAccount({...account, activeInstallments: Number(e.target.value)})}
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Due Date</label>
                  <input 
                    type="date" 
                    value={account.dueDate}
                    onChange={(e) => setAccount({...account, dueDate: e.target.value})}
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Closing Day (1-31)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="31"
                    value={account.statementClosingDay}
                    onChange={(e) => setAccount({...account, statementClosingDay: Number(e.target.value)})}
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest">Last Statement Balance ($)</label>
                <input 
                  type="number" 
                  value={account.lastStatementBalance}
                  onChange={(e) => setAccount({...account, lastStatementBalance: Number(e.target.value)})}
                  className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || !account.name}
            className="w-full bg-[#2D34FB] text-white font-lexend font-bold py-5 rounded-3xl shadow-xl shadow-[#2D34FB]/20 mt-4 flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isSaving ? 'Synchronizing Node...' : (
              <>
                <Plus className="w-5 h-5" />
                Establish Capital Node
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
