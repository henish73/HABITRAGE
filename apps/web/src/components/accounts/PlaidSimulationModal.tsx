'use client';

import React, { useState } from 'react';
import { useFinanceStore } from '@/lib/store';
import { X, CheckCircle2, ShieldCheck, ArrowRight, Loader2, Landmark } from 'lucide-react';
import { toast } from 'sonner';

export function PlaidSimulationModal() {
  const { isPlaidModalOpen, closePlaidModal } = useFinanceStore();
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isPlaidModalOpen) return null;

  const banks = [
    { id: 'cibc', name: 'CIBC', color: 'bg-negative', sub: 'Canadian Imperial Bank of Commerce' },
    { id: 'td', name: 'TD Bank', color: 'bg-positive', sub: 'Toronto-Dominion Bank' },
    { id: 'rbc', name: 'RBC Royal Bank', color: 'bg-accent', sub: 'Royal Bank of Canada' },
    { id: 'rogers', name: 'Rogers Bank', color: 'bg-negative', sub: 'Rogers Mastercard & Accounts' },
    { id: 'amex', name: 'American Express', color: 'bg-accent', sub: 'Amex Canada Cards' },
  ];

  const handleConnect = () => {
    if (!selectedBank) return;
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setSelectedBank(null);
        closePlaidModal();
        toast.success(`Connected successfully to ${selectedBank.toUpperCase()}! All transactions synced.`);
      }, 1200);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={closePlaidModal}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        {!isSuccess ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Connect Bank Account</h3>
                <p className="text-xs text-muted-foreground">Select your financial institution to simulate sync</p>
              </div>
            </div>

            <div className="space-y-2 my-5">
              {banks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBank(b.name)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedBank === b.name
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl ${b.color} text-white flex items-center justify-center font-bold text-xs`}>
                      {b.name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">{b.name}</div>
                      <div className="text-[11px] text-muted-foreground">{b.sub}</div>
                    </div>
                  </div>
                  {selectedBank === b.name && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/50 p-2.5 rounded-xl border border-border mb-4">
              <ShieldCheck className="w-4 h-4 text-positive shrink-0" />
              <span>Simulated 256-bit bank-grade encryption with zero credential storage.</span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={closePlaidModal}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!selectedBank || isConnecting}
                onClick={handleConnect}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-positive/10 text-positive flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-foreground">Sync Complete</h4>
            <p className="text-xs text-muted-foreground">Successfully linked and imported accounts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
