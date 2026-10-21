import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Clock, AlertTriangle, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Transaction, AppState } from '../types';

interface PurchaseFrictionModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  ehr: number;
  recoveryScore?: number;
}

export const PurchaseFrictionModal: React.FC<PurchaseFrictionModalProps> = ({ 
  userId, 
  isOpen, 
  onClose, 
  ehr,
  recoveryScore = 100
}) => {
  const [price, setPrice] = useState('');
  const [merchant, setMerchant] = useState('');
  const [step, setStep] = useState<'input' | 'pause' | 'result'>('input');

  const requiredHours = ehr > 0 ? parseFloat(price) / ehr : 0;
  const isHighStress = recoveryScore < 50;

  const handleCalculate = () => {
    if (!price || !merchant) return;
    if (isHighStress) {
      setStep('pause');
    } else {
      setStep('result');
    }
  };

  const reset = () => {
    setPrice('');
    setMerchant('');
    setStep('input');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#2D3748]/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[40px] w-full max-w-xl p-10 shadow-2xl relative overflow-hidden"
      >
        <button onClick={reset} className="absolute top-8 right-8 p-2 text-[#718096] hover:bg-[#F9F7F2] rounded-xl transition-colors">
          <X className="w-6 h-6" />
        </button>

        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-lexend font-bold text-[#2D3748]">Purchase Friction</h3>
                <p className="text-[#718096] text-sm font-medium">Cognitive intervention for financial liquidity.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-[#2D3748] uppercase tracking-widest">Item Price ($)</label>
                  <input 
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-lexend text-2xl focus:outline-none focus:ring-4 focus:ring-[#2D34FB]/10"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-[#2D3748] uppercase tracking-widest">Merchant / Item</label>
                  <input 
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="What are you acquiring?"
                    className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 font-medium focus:outline-none focus:ring-4 focus:ring-[#2D34FB]/10"
                  />
                </div>

                <button
                  onClick={handleCalculate}
                  disabled={!price || !merchant}
                  className="w-full bg-[#2D34FB] text-white py-5 rounded-2xl font-lexend font-bold text-lg hover:bg-[#1A23D6] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Analyze Labor Cost
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'pause' && (
            <motion.div 
              key="pause"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-8 text-center"
            >
              <div className="w-24 h-24 bg-orange-500/10 rounded-[32px] flex items-center justify-center mx-auto text-orange-600 mb-6">
                <AlertTriangle className="w-12 h-12" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-lexend font-bold text-[#2D3748]">High Stress Detected</h3>
                <p className="text-[#718096] max-w-md mx-auto leading-relaxed">
                  Your recovery score is currently <span className="font-bold text-orange-600">{recoveryScore}</span>. 
                  Impulse spending is often a biological response to stress. Take 10 deep breaths before proceeding.
                </p>
              </div>

              <div className="pt-8 space-y-4">
                <button
                  onClick={() => setStep('result')}
                  className="w-full bg-[#F9F7F2] text-[#2D3748] py-4 rounded-2xl font-lexend font-bold hover:bg-[#E2E8F0] transition-all"
                >
                  I've Breathed. Show Result.
                </button>
                <button
                  onClick={reset}
                  className="w-full text-[#718096] font-bold text-sm uppercase tracking-widest hover:text-[#2D3748]"
                >
                  Abandon Purchase
                </button>
              </div>
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-lexend font-bold text-[#2D3748]">Labor Quantization</h3>
                <p className="text-[#718096] text-sm font-medium">Acquisition cost relative to professional yield.</p>
              </div>

              <div className="bg-[#F9F7F2] rounded-[32px] p-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[#718096] uppercase tracking-widest">Required Work Hours</p>
                    <p className="text-5xl font-lexend font-bold text-[#2D34FB]">{requiredHours.toFixed(1)}h</p>
                  </div>
                  <div className="w-16 h-16 bg-[#2D34FB]/10 rounded-2xl flex items-center justify-center text-[#2D34FB]">
                    <Clock className="w-8 h-8" />
                  </div>
                </div>

                <div className="pt-8 border-t border-[#E2E8F0] space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#718096]">Item Price</span>
                    <span className="font-bold text-[#2D3748]">${parseFloat(price).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#718096]">Merchant</span>
                    <span className="font-bold text-[#2D3748]">{merchant}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#718096]">Net Hourly Rate (EHR)</span>
                    <span className="font-bold text-[#2D34FB]">${ehr.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={reset}
                  className="w-full bg-[#2D3748] text-white py-5 rounded-2xl font-lexend font-bold hover:bg-black transition-all shadow-xl shadow-black/10"
                >
                  Acknowledged. Return.
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
