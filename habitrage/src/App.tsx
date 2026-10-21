/**
 * HABITRAGE: Personal Intelligence Mesh
 * Phase 1 Refinement: Ethereal Harmony & Hyper-Fluid UI
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc,
  collection,
  query,
  getDocs,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { 
  LayoutGrid, 
  Wallet, 
  CheckCircle2, 
  HeartPulse, 
  BookOpen, 
  PenTool, 
  Briefcase,
  Search,
  Plus,
  Settings,
  Lock,
  LogOut,
  ChevronRight,
  Zap,
  Activity,
  AlertCircle,
  Sparkles,
  FileSpreadsheet,
  PlusCircle,
  X,
  Cpu,
  Mic,
  Upload,
  Landmark,
  CreditCard
} from 'lucide-react';
import { PWAInstallButton } from './components/PWAInstallButton';
import { auth, db } from './lib/firebase';
import { encryptKey, decryptKey } from './lib/crypto';
import { AppState, VaultSettings, Pillar, Shift, Account, Task, HealthLog, Transaction, JournalEntry, EmployerConfig, Milestone } from './types';
import { FinanceEngine } from './components/FinanceEngine';
import { CSVIngestor } from './components/CSVIngestor';
import { ShiftPredictor } from './components/ShiftPredictor';
import { AddAccountModal } from './components/AddAccountModal';
import { EditAccountModal } from './components/EditAccountModal';
import { WorkflowsKanban } from './components/WorkflowsKanban';
import { HealthDashboard } from './components/HealthDashboard';
import { RenphoVision } from './components/RenphoVision';
import { AddTaskModal } from './components/AddTaskModal';
import { JournalEngine } from './components/JournalEngine';
import { CreativeMesh } from './components/CreativeMesh';
import { ProfessionalExpansion } from './components/ProfessionalExpansion';
import { AIFinancialCopilot } from './components/AIFinancialCopilot';
import { AutopilotEngine } from './components/AutopilotEngine';
import { AutopilotCommand } from './components/AutopilotCommand';
import { FocusMode } from './components/FocusMode';
import { AudioBriefingWidget } from './components/AudioBriefingWidget';
import { SerendipityEngine } from './components/SerendipityEngine';
import { flushOfflineQueue } from './lib/db';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`[Firestore ${operationType}] at ${path}:`, error);
}

// --- UI Components ---

const BentoCard = ({ 
  children, 
  className, 
  title, 
  icon: Icon,
  accent = false,
  onClick,
  delay = 0
}: { 
  children: React.ReactNode, 
  className?: string, 
  title?: string, 
  icon?: any,
  accent?: boolean,
  onClick?: () => void,
  delay?: number
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay,
        type: 'spring', 
        stiffness: 260, 
        damping: 20 
      }}
      whileHover={{ 
        y: -8, 
        scale: 1.015,
        boxShadow: "0 25px 50px -12px rgba(45, 52, 251, 0.08)"
      }}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden backdrop-blur-md border rounded-[32px] p-6 cursor-pointer transition-all duration-500",
        accent 
          ? "bg-[#2D34FB] border-[#2D34FB] text-white shadow-xl shadow-[#2D34FB]/20" 
          : "bg-white/80 border-[#E2E8F0] hover:border-[#2D34FB]/30",
        className
      )}
    >
      {/* Decorative Glow */}
      <div className={cn(
        "absolute -top-24 -right-24 w-48 h-48 blur-[80px] rounded-full transition-opacity duration-500 opacity-0 group-hover:opacity-20",
        accent ? "bg-white" : "bg-[#2D34FB]"
      )} />

      {title && (
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-2xl transition-colors duration-300",
              accent ? "bg-white/10" : "bg-[#2D34FB]/5 group-hover:bg-[#2D34FB]/10"
            )}>
              {Icon && <Icon className={cn("w-5 h-5", accent ? "text-white" : "text-[#2D34FB]")} />}
            </div>
            <h3 className={cn("font-lexend font-semibold text-[17px] tracking-tight", accent ? "text-white" : "text-[#2D3748]")}>
              {title}
            </h3>
          </div>
          {!accent && <ChevronRight className="w-4 h-4 text-[#718096] opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0" />}
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

const NavIcon = ({ 
  icon: Icon, 
  active = false, 
  onClick,
  label
}: { 
  icon: any, 
  active?: boolean, 
  onClick?: () => void,
  label: string
}) => (
  <button
    onClick={onClick}
    className="relative group flex items-center justify-center w-12 h-12"
  >
    <div className={cn(
      "absolute inset-0 rounded-2xl transition-all duration-500 ease-out",
      active ? "bg-[#2D34FB] scale-100" : "bg-transparent scale-50 group-hover:bg-[#F9F7F2] group-hover:scale-90"
    )} />
    <Icon className={cn(
      "relative z-10 w-6 h-6 transition-colors duration-300",
      active ? "text-white" : "text-[#718096] group-hover:text-[#2D34FB]"
    )} />
    
    {/* Tooltip */}
    <span className="absolute left-16 bg-[#2D3748] text-white text-[10px] font-lexend font-bold px-2 py-1 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">
      {label}
    </span>

    {active && (
      <motion.div 
        layoutId="nav-glow"
        className="absolute -inset-1 bg-[#2D34FB]/20 blur-md rounded-2xl"
      />
    )}
  </button>
);

// --- Main Application ---

export default function App() {
  const [state, setState] = useState<AppState>({
    user: null,
    vault: null,
    accounts: [],
    tasks: [],
    healthLogs: [],
    journalEntries: [],
    transactions: [],
    shifts: [],
    canvases: [],
    milestones: [],
    autopilotLogs: [],
    openRouterKey: null,
    googleAccessToken: null,
    employers: [],
    professionalSettings: null,
    loading: true,
    error: null
  });

  const [activeTab, setActiveTab] = useState<Pillar | 'home'>('home');
  const [showVault, setShowVault] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showVisionScan, setShowVisionScan] = useState(false);
  const [showIngestor, setShowIngestor] = useState(false);
  const [ingestMode, setIngestMode] = useState<'bank' | 'credit' | 'bulk_bank' | 'bulk_credit'>('bank');
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [activeFocusTask, setActiveFocusTask] = useState<Task | undefined>();
  const [brainDump, setBrainDump] = useState('');
  const [isDistilling, setIsDistilling] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Derived Metrics
  const netLiquidity = useMemo(() => {
    const totalCash = state.accounts
      .filter(a => a.type !== 'credit_card')
      .reduce((sum, a) => sum + (a.startingBalance || 0), 0);
    const totalDebt = state.accounts
      .filter(a => a.type === 'credit_card')
      .reduce((sum, a) => sum + (a.startingBalance || 0), 0);
    return totalCash - totalDebt;
  }, [state.accounts]);

  const professionalYield = useMemo(() => {
    if (state.shifts.length === 0) return 0;
    const totalGross = state.shifts.reduce((sum, s) => sum + (s.grossEstimatedPay || 0), 0);
    const totalHours = state.shifts.reduce((sum, s) => sum + s.scheduledHours, 0);
    return totalHours > 0 ? totalGross / totalHours : 0;
  }, [state.shifts]);

  const recoveryScore = useMemo(() => {
    if (state.healthLogs.length === 0) return 0;
    const latest = [...state.healthLogs].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    return latest.recoveryScore || 0;
  }, [state.healthLogs]);

  const handleBrainDumpSubmit = async (e?: React.KeyboardEvent | React.MouseEvent) => {
    if ((e && 'key' in e && e.key !== 'Enter') || !brainDump.trim() || isDistilling) return;
    
    setIsDistilling(true);
    setToast({ message: "Connecting to OpenRouter Mesh...", type: 'success' });
    
    try {
      let decryptedKey = null;
      if (state.vault?.openRouterKeyEncrypted) {
        try {
          decryptedKey = await decryptKey(state.vault.openRouterKeyEncrypted, state.user.uid);
        } catch (e) {
          console.error("Vault decryption failed:", e);
          throw new Error("Unable to decrypt your OpenRouter API Key. Please check your Vault settings.");
        }
      }

      if (!decryptedKey) {
        throw new Error("OpenRouter API Key not found. Please set it up in the Vault.");
      }

      const response = await fetch('/api/distill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: brainDump, 
          uid: state.user.uid,
          openRouterKey: decryptedKey,
          model: "deepseek/deepseek-chat" // Use a fast OpenRouter model for distillation
          })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Mesh processing failed");
      }
      
      const { type, payload, summary, timestamp } = await response.json();
      const uid = state.user.uid;
      
      let collectionName = '';
      let idField = '';
      let finalPayload = { ...payload, timestamp };
      
      switch(type) {
        case 'transaction': 
          collectionName = 'transactions';
          idField = 'txId';
          break;
        case 'task': 
          collectionName = 'tasks';
          idField = 'taskId';
          const dueDate = payload.dueDate || new Date().toISOString();
          finalPayload.dueDate = dueDate;
          finalPayload.originalDueDate = dueDate;
          finalPayload.rescheduleCount = 0;
          break;
        case 'health_log': 
          collectionName = 'health_logs';
          idField = 'logId';
          break;
        case 'journal_entry': 
          collectionName = 'journal_entries';
          idField = 'entryId';
          break;
      }
      
      const entityId = crypto.randomUUID();
      finalPayload[idField] = entityId;
      
      await setDoc(doc(db, `users/${uid}/${collectionName}/${entityId}`), finalPayload);
      
      setToast({ message: summary, type: 'success' });
      setBrainDump('');
    } catch (err: any) {
      console.error(err);
      setToast({ message: "Distillation failed. Please try again.", type: 'error' });
    } finally {
      setIsDistilling(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => flushOfflineQueue();
    window.addEventListener('online', handleOnline);
    // Initial check
    if (navigator.onLine) flushOfflineQueue();
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const resetMeshBalances = async () => {
    const uid = state.user?.uid || auth.currentUser?.uid;
    if (!uid) {
      setToast({ message: "Authentication failure. Please re-login.", type: 'error' });
      return;
    }
    
    const accountPath = `users/${uid}/accounts`;
    
    try {
      const accountSnap = await getDocs(collection(db, accountPath));
      console.log(`Resetting balances for ${accountSnap.docs.length} nodes.`);
      
      if (accountSnap.docs.length > 0) {
        const accountBatch = writeBatch(db);
        accountSnap.docs.forEach(d => {
          accountBatch.update(d.ref, { 
            startingBalance: 0, 
            principalBalance: 0,
            currentBalance: 0 
          });
        });
        await accountBatch.commit();
      }
      
      setToast({ message: "All node balances recalibrated to zero.", type: 'success' });
    } catch (err) {
      console.error("Mesh balance reset failure:", err);
      setToast({ message: "Mesh balance reset failed.", type: 'error' });
    }
  };

  const addTransaction = async (tx: Omit<Transaction, 'txId'>) => {
    if (!state.user) return;
    try {
      const txId = Math.random().toString(36).substring(7);
      const txDoc = doc(db, `users/${state.user.uid}/transactions`, txId);
      await setDoc(txDoc, { ...tx, txId });
      setToast({ message: "Signal synchronized to mesh.", type: 'success' });
    } catch (err) {
      console.error("Transaction sync failed:", err);
      setToast({ message: "Signal sync failed.", type: 'error' });
    }
  };

  const updateTransaction = async (txId: string, updates: Partial<Transaction>) => {
    if (!state.user) return;
    try {
      const txDoc = doc(db, `users/${state.user.uid}/transactions`, txId);
      await setDoc(txDoc, updates, { merge: true });
      setToast({ message: "Signal mesh updated.", type: 'success' });
    } catch (err) {
      console.error("Signal update failed:", err);
      setToast({ message: "Signal update failed.", type: 'error' });
    }
  };

  const deleteTransaction = async (txId: string) => {
    if (!state.user) return;
    try {
      const txDoc = doc(db, `users/${state.user.uid}/transactions`, txId);
      await deleteDoc(txDoc);
      setToast({ message: "Signal purged from mesh.", type: 'success' });
    } catch (err) {
      console.error("Signal purge failed:", err);
      setToast({ message: "Signal purge failed.", type: 'error' });
    }
  };

  const updateAccount = async (account: Account) => {
    if (!state.user) return;
    try {
      await setDoc(doc(db, `users/${state.user.uid}/accounts/${account.accountId}`), account);
      setToast({ message: "Node parameters recalibrated.", type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to recalibrate node.", type: 'error' });
    }
  };

  useEffect(() => {
    const decryptVault = async () => {
      if (state.user && state.vault?.openRouterKeyEncrypted) {
        try {
          const key = await decryptKey(state.vault.openRouterKeyEncrypted, state.user.uid);
          setState(prev => ({ ...prev, openRouterKey: key }));
        } catch (err) {
          console.error("Vault decryption failed:", err);
          setState(prev => ({ ...prev, openRouterKey: null }));
        }
      } else {
        setState(prev => ({ ...prev, openRouterKey: null }));
      }
    };
    decryptVault();
  }, [state.user, state.vault]);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setState(prev => ({ ...prev, user, loading: false }));
    });
  }, []);

  useEffect(() => {
    if (!state.user) return;
    const uid = state.user.uid;
    
    const unsubVault = onSnapshot(doc(db, `users/${uid}/settings/vault`), (doc) => {
      if (doc.exists()) setState(prev => ({ ...prev, vault: doc.data() as VaultSettings }));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'vault'));

    const unsubAccounts = onSnapshot(collection(db, `users/${uid}/accounts`), (snap) => {
      setState(prev => ({ ...prev, accounts: snap.docs.map(d => ({ ...d.data(), accountId: d.id } as any)) }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'accounts'));

    const unsubTransactions = onSnapshot(collection(db, `users/${uid}/transactions`), (snap) => {
      setState(prev => ({ ...prev, transactions: snap.docs.map(d => ({ ...d.data(), txId: d.id } as any)) }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    const unsubTasks = onSnapshot(collection(db, `users/${uid}/tasks`), (snap) => {
      setState(prev => ({ ...prev, tasks: snap.docs.map(d => ({ ...d.data(), taskId: d.id } as any)) }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));

    const unsubHealth = onSnapshot(collection(db, `users/${uid}/health_logs`), (snap) => {
      const logs = snap.docs.map(d => ({ ...d.data(), logId: d.id } as HealthLog));
      logs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setState(prev => ({ ...prev, healthLogs: logs }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'health_logs'));

    const unsubJournal = onSnapshot(collection(db, `users/${uid}/journal_entries`), (snap) => {
      setState(prev => ({ ...prev, journalEntries: snap.docs.map(d => ({ ...d.data(), entryId: d.id } as any)) }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'journal_entries'));

    const unsubShifts = onSnapshot(collection(db, `users/${uid}/shifts`), (snap) => {
      setState(prev => ({ ...prev, shifts: snap.docs.map(d => ({ ...d.data(), shiftId: d.id } as any)) }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'shifts'));

    const unsubCanvases = onSnapshot(collection(db, `users/${uid}/canvases`), (snap) => {
      setState(prev => ({ ...prev, canvases: snap.docs.map(d => ({ ...d.data(), canvasId: d.id } as any)) }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'canvases'));

    const unsubMilestones = onSnapshot(collection(db, `users/${uid}/milestones`), (snap) => {
      setState(prev => ({ ...prev, milestones: snap.docs.map(d => ({ ...d.data(), milestoneId: d.id } as any)) }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'milestones'));

    const unsubAutopilot = onSnapshot(collection(db, `users/${uid}/autopilot_logs`), (snap) => {
      setState(prev => ({ ...prev, autopilotLogs: snap.docs.map(d => ({ ...d.data(), logId: d.id } as any)) }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'autopilot_logs'));

    const unsubEmployers = onSnapshot(collection(db, `users/${uid}/employers`), (snap) => {
      setState(prev => ({ ...prev, employers: snap.docs.map(d => ({ ...d.data(), employerId: d.id } as EmployerConfig)) }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'employers'));

    const unsubProSettings = onSnapshot(doc(db, `users/${uid}/settings/professional`), (doc) => {
      if (doc.exists()) setState(prev => ({ ...prev, professionalSettings: doc.data() as any }));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'professional_settings'));

    return () => { 
      unsubVault(); 
      unsubAccounts(); 
      unsubTransactions();
      unsubTasks();
      unsubHealth();
      unsubJournal();
      unsubShifts();
      unsubCanvases();
      unsubMilestones();
      unsubAutopilot();
      unsubEmployers();
      unsubProSettings();
    };
  }, [state.user]);

  const handleLogin = async () => {
    try { 
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setState(prev => ({ ...prev, googleAccessToken: credential.accessToken }));
      }
      setToast({ message: "Welcome to the Habitrage Mesh.", type: 'success' });
    } catch (err) { 
      console.error(err); 
      setToast({ message: "Mesh authentication failed.", type: 'error' });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setToast({ message: "Mesh disconnected safely.", type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: "Disconnection failure.", type: 'error' });
    }
  };

  if (state.loading) return (
    <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
        <Zap className="w-10 h-10 text-[#2D34FB]" />
      </motion.div>
    </div>
  );

  if (!state.user) return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full space-y-12"
      >
        <div className="space-y-4">
          <div className="w-24 h-24 bg-[#2D34FB] rounded-[40px] mx-auto flex items-center justify-center shadow-2xl shadow-[#2D34FB]/30">
            <Zap className="w-12 h-12 text-white" />
          </div>
          <h1 className="font-lexend text-6xl font-bold text-[#2D3748] tracking-tighter">HABITRAGE</h1>
          <p className="font-inter text-[#718096] text-lg max-w-[280px] mx-auto leading-relaxed">
            Personal Intelligence Mesh for <span className="text-[#2D34FB] font-semibold underline decoration-2 underline-offset-4">Calm Authority</span>.
          </p>
        </div>
        <button
          onClick={handleLogin}
          className="w-full bg-white border border-[#E2E8F0] shadow-xl shadow-black/5 rounded-[32px] p-5 flex items-center justify-center gap-4 font-lexend font-bold text-[#2D3748] hover:bg-[#F9F7F2] transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
          Enter Dashboard
        </button>
      </motion.div>
    </div>
  );

  return (
    <LayoutGroup>
      <div className="min-h-screen bg-[#F9F7F2] font-inter text-[#2D3748] flex flex-col lg:flex-row overflow-x-hidden">
        
        {/* --- Floating Sidebar --- */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 lg:static lg:translate-x-0 lg:ml-6 lg:my-6 w-[90%] max-w-md lg:w-24 bg-white/80 backdrop-blur-xl border border-[#E2E8F0] rounded-[40px] flex flex-row lg:flex-col items-center py-3 lg:py-8 px-4 lg:px-0 z-[100] shadow-2xl shadow-black/5">
          <div className="hidden lg:flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-[#2D34FB] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#2D34FB]/20">
              <Zap className="w-7 h-7" />
            </div>
          </div>
          
          <div className="flex flex-1 lg:flex-none justify-around w-full lg:flex-col items-center gap-2 lg:gap-5">
            <NavIcon icon={LayoutGrid} label="Command" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <NavIcon icon={Wallet} label="Finance" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
            <NavIcon icon={CheckCircle2} label="Habits" active={activeTab === 'habits'} onClick={() => setActiveTab('habits')} />
            <NavIcon icon={HeartPulse} label="Health" active={activeTab === 'health'} onClick={() => setActiveTab('health')} />
            <NavIcon icon={BookOpen} label="Journal" active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} />
            <NavIcon icon={PenTool} label="Creative" active={activeTab === 'creative'} onClick={() => setActiveTab('creative')} />
            <NavIcon icon={Briefcase} label="Pro" active={activeTab === 'professional'} onClick={() => setActiveTab('professional')} />
          </div>

          <div className="hidden lg:flex flex-col items-center gap-6 mt-auto">
            <NavIcon icon={Settings} label="Vault" onClick={() => setShowVault(true)} />
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#E2E8F0] p-0.5">
              <img src={state.user.photoURL} alt="User" className="w-full h-full rounded-[14px]" />
            </div>
          </div>
        </nav>

        {/* --- Main Content Stage --- */}
        <main className="flex-1 p-6 lg:p-12 lg:pl-16 max-w-[1700px] mx-auto w-full pb-32 lg:pb-12">
          
          {showAddAccount && (
            <AddAccountModal 
              userId={state.user.uid} 
              onClose={() => setShowAddAccount(false)} 
              onSuccess={(msg) => setToast({ message: msg, type: 'success' })}
            />
          )}

          {editingAccount && (
            <EditAccountModal
              userId={state.user.uid}
              account={editingAccount}
              onClose={() => setEditingAccount(null)}
              onSuccess={(msg) => setToast({ message: msg, type: 'success' })}
            />
          )}
          {/* Header Section */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="space-y-3">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-lexend text-5xl font-bold text-[#2D3748] tracking-tight"
              >
                Focus, {state.user.displayName.split(' ')[0]}
              </motion.h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-full shadow-sm">
                  <div className="relative">
                    <div className="w-2 h-2 bg-[#8DAA91] rounded-full animate-ping absolute inset-0" />
                    <div className="w-2 h-2 bg-[#8DAA91] rounded-full relative" />
                  </div>
                  <span className="text-[11px] font-lexend font-bold text-[#2D3748] uppercase tracking-widest">
                    Status: Calm Authority
                  </span>
                </div>
                <div className="text-[#718096] text-xs font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#2D34FB]" />
                  6 Pillars Synced
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative group flex-1 md:w-96 flex gap-2">
                <Search className={cn(
                  "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                  isDistilling ? "text-[#2D34FB] animate-pulse" : "text-[#718096] group-focus-within:text-[#2D34FB]"
                )} />
                <input
                  type="text"
                  value={brainDump}
                  onChange={(e) => setBrainDump(e.target.value)}
                  onKeyDown={handleBrainDumpSubmit}
                  disabled={isDistilling}
                  placeholder={isDistilling ? "Mesh Distiller active..." : "Brain Dump: Type, record, or drop..."}
                  className={cn(
                    "w-full bg-white border border-[#E2E8F0] rounded-[28px] pl-14 pr-6 py-4 focus:outline-none focus:ring-4 focus:ring-[#2D34FB]/5 font-medium transition-all",
                    isDistilling && "opacity-70 cursor-wait"
                  )}
                />
                <button
                   className="p-4 bg-white border border-[#E2E8F0] rounded-[22px] text-[#718096] hover:text-[#2D34FB]"
                >
                  <Mic className="w-5 h-5" />
                </button>
                {isDistilling && (
                  <motion.div 
                    layoutId="input-loading"
                    className="absolute inset-y-0 right-4 flex items-center"
                  >
                    <div className="w-6 h-6 border-2 border-[#2D34FB]/20 border-t-[#2D34FB] rounded-full animate-spin" />
                  </motion.div>
                )}
              </div>
              <button 
                onClick={() => handleBrainDumpSubmit()}
                disabled={isDistilling || !brainDump.trim()}
                className="bg-[#2D34FB] text-white h-14 w-14 rounded-[22px] shadow-2xl shadow-[#2D34FB]/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                <Plus className={cn("w-8 h-8 transition-transform", isDistilling && "rotate-45")} />
              </button>
              <AudioBriefingWidget 
                logs={state.healthLogs}
                shifts={state.shifts}
                accounts={state.accounts}
              />
            </div>
          </header>

          {/* Bento Hub */}
          <AnimatePresence mode="wait">
            {activeTab === 'home' ? (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[220px]"
              >
                
                {/* Primary Sync Card */}
                <BentoCard 
                  title="Mesh Synchronicity" 
                  icon={Activity} 
                  accent 
                  className="md:col-span-2 lg:col-span-2 row-span-2"
                  delay={0.1}
                >
                  <div className="h-full flex flex-col justify-between py-2">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-lexend font-bold uppercase tracking-[0.2em]">
                        {state.transactions.length > 0 ? 'Signals Processing' : 'Mesh Idle'}
                      </div>
                      <h4 className="text-4xl font-lexend font-bold leading-tight max-w-sm">
                        {state.transactions.length > 0 
                          ? `${state.transactions.length.toLocaleString()} temporal data points synced.`
                          : 'No data signals detected in the current mesh.'}
                      </h4>
                      <p className="text-white/70 text-lg font-medium">
                        Synchronize your monthly statements to populate the financial node network.
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-8">
                      <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                           <Landmark className="w-5 h-5" />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                           <CreditCard className="w-5 h-5" />
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('finance')}
                        className="bg-white text-[#2D34FB] px-8 py-4 rounded-2xl font-lexend font-bold text-base shadow-xl hover:bg-white/90 transition-all hover:translate-y-[-2px] active:translate-y-0"
                      >
                        Enter Sync Command
                      </button>
                    </div>
                  </div>
                </BentoCard>

                {/* Node Status */}
                <BentoCard title="Financial Nodes" icon={Wallet} delay={0.2} onClick={() => setActiveTab('finance')}>
                  <div className="mt-2 space-y-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-lexend font-bold text-[#2D3748] tracking-tight">
                        {state.accounts.length}
                      </span>
                      <span className="text-[#718096] font-medium ml-1">Nodes Active</span>
                    </div>
                    <div className="text-xs text-[#718096] font-medium leading-relaxed">
                      {state.accounts.filter(a => a.type === 'bank_checking').length} Bank • {state.accounts.filter(a => a.type === 'credit_card').length} Credit
                    </div>
                  </div>
                </BentoCard>

                {/* Cognitive State */}
                <BentoCard title="Task Mesh" icon={CheckCircle2} delay={0.3} onClick={() => setActiveTab('habits')}>
                  <div className="space-y-4">
                    <div className="flex items-baseline gap-1">
                       <span className="text-4xl font-lexend font-bold text-[#2D3748] tracking-tight">
                         {state.tasks.filter(t => t.status === 'todo').length}
                       </span>
                       <span className="text-[#718096] font-medium ml-1">Open Signals</span>
                    </div>
                    <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-[#2D34FB] transition-all" 
                         style={{ width: `${(state.tasks.filter(t => t.status === 'completed').length / Math.max(state.tasks.length, 1)) * 100}%` }}
                       />
                    </div>
                  </div>
                </BentoCard>

                {/* Professional Status (Pillar 6) */}
                <BentoCard title="Professional" icon={Briefcase} delay={0.4} className="lg:col-start-3" onClick={() => setActiveTab('professional')}>
                  <div className="space-y-1">
                    <p className="text-[10px] font-lexend font-bold text-[#718096] uppercase tracking-widest mb-1">Active Mesh</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-lexend font-bold">
                        {state.shifts.length}
                      </span>
                      <span className="text-[#718096] font-medium">Nodes</span>
                    </div>
                    <p className="text-[10px] text-[#2D34FB] font-bold">
                      Professional Matrix Status
                    </p>
                  </div>
                </BentoCard>

                {/* Autopilot Command Center (Phase 6) */}
                <BentoCard title="Mission Control" icon={Cpu} delay={0.5} className="lg:col-start-4">
                  <AutopilotCommand state={state} />
                </BentoCard>
              </motion.div>
            ) : (
              <motion.div
                key="pillar-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                {activeTab === 'finance' && (
                  <div className="space-y-12">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <h2 className="text-4xl font-lexend font-bold text-[#2D3748]">Finance Engine</h2>
                        <p className="text-[#718096]">Mesh-synchronized capital & debt oversight.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <PWAInstallButton />
                        <button 
                          onClick={() => setShowAddAccount(true)}
                          className="flex items-center gap-2 px-6 py-3 bg-white border border-[#E2E8F0] rounded-[20px] font-lexend font-bold text-sm text-[#718096] hover:border-[#2D34FB]/30 transition-all"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Link Account
                        </button>
                      </div>
                    </header>

                    <FinanceEngine 
                      userId={state.user.uid}
                      accounts={state.accounts} 
                      transactions={state.transactions} 
                      onAddAccount={() => setShowAddAccount(true)} 
                      onEditAccount={(acc) => setEditingAccount(acc)}
                      onUpdateAccount={updateAccount}
                      onIngest={(mode) => {
                        setIngestMode(mode);
                        setShowIngestor(true);
                      }}
                      onBulkIngest={(type) => {
                        setIngestMode(type === 'bank' ? 'bulk_bank' : 'bulk_credit');
                        setShowIngestor(true);
                      }}
                      onDeleteAllTransactions={resetMeshBalances}
                      onAddTransaction={addTransaction}
                      onUpdateTransaction={updateTransaction}
                      onDeleteTransaction={deleteTransaction}
                      openRouterKey={state.openRouterKey || ''}
                      recoveryScore={state.healthLogs[0]?.recoveryScore}
                    />
                    
                    {showIngestor && (
                      <div className="fixed inset-0 flex items-center justify-center z-[300] p-6">
                        <div className="absolute inset-0 bg-[#2D3748]/40 backdrop-blur-md" onClick={() => setShowIngestor(false)} />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          className="relative w-full max-w-4xl bg-white rounded-[48px] p-12 shadow-2xl border border-[#E2E8F0] overflow-y-auto max-h-[90vh]"
                        >
                          <div className="flex items-center justify-between mb-8">
                            <h3 className="text-3xl font-lexend font-bold text-[#2D3748]">
                             {ingestMode === 'bank' ? 'Bank' : ingestMode === 'credit' ? 'Credit Card' : ingestMode === 'bulk_bank' ? 'Bulk Bank Matrix' : 'Bulk Credit Matrix'} Ingestor
                            </h3>
                            <button onClick={() => setShowIngestor(false)} className="text-[#718096] hover:text-[#2D3748] p-2">
                              <X className="w-8 h-8" />
                            </button>
                          </div>
                          <CSVIngestor 
                            userId={state.user.uid} 
                            accounts={state.accounts} 
                            mode={ingestMode}
                            onSuccess={(count) => {
                              setToast({ message: `Successfully ingested ${count} transactions into mesh.`, type: 'success' });
                              setShowIngestor(false);
                            }} 
                            onError={(msg) => setToast({ message: msg, type: 'error' })}
                          />
                        </motion.div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'professional' && (
                  <div className="space-y-12">
                    <ProfessionalExpansion 
                      userId={state.user.uid}
                      shifts={state.shifts}
                      milestones={state.milestones}
                      googleAccessToken={state.googleAccessToken}
                      employers={state.employers}
                      onSuccess={(msg) => setToast({ message: msg, type: 'success' })}
                      onError={(msg) => setToast({ message: msg, type: 'error' })}
                    />
                  </div>
                )}

                {activeTab === 'habits' && (
                  <div className="space-y-12">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <h2 className="text-4xl font-lexend font-bold text-[#2D3748]">Workflows Mesh</h2>
                        <p className="text-[#718096] font-medium">Cognitive load distribution & task resolution.</p>
                      </div>
                      <button 
                        onClick={() => setShowAddTask(true)}
                        className="bg-[#2D34FB] text-white px-8 py-4 rounded-2xl font-lexend font-bold text-sm shadow-xl shadow-[#2D34FB]/20 hover:bg-[#1A23D6] transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Initialize Task
                      </button>
                    </header>

                    <WorkflowsKanban 
                      userId={state.user.uid}
                      tasks={state.tasks}
                      onAddTask={() => setShowAddTask(true)}
                      onSuccess={(msg) => setToast({ message: msg, type: 'success' })}
                      onError={(msg) => setToast({ message: msg, type: 'error' })}
                    />
                  </div>
                )}

                {activeTab === 'health' && (
                  <div className="space-y-12">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <h2 className="text-4xl font-lexend font-bold text-[#2D3748]">Vitality Mesh</h2>
                        <p className="text-[#718096] font-medium">Biometric telemetry & physiological recovery.</p>
                      </div>
                      <button 
                        onClick={() => setShowVisionScan(true)}
                        className="bg-[#2D3748] text-white px-8 py-4 rounded-2xl font-lexend font-bold text-sm shadow-xl shadow-black/10 hover:bg-[#1A202C] transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Renpho Vision
                      </button>
                    </header>

                    <HealthDashboard 
                      userId={state.user.uid}
                      logs={state.healthLogs}
                      onVisionScan={() => setShowVisionScan(true)}
                    />
                  </div>
                )}

                {activeTab === 'journal' && (
                  <JournalEngine 
                    userId={state.user.uid}
                    entries={state.journalEntries}
                    openRouterKey={state.openRouterKey || ''}
                  />
                )}

                {activeTab === 'creative' && (
                  <div className="space-y-12">
                    <CreativeMesh 
                      userId={state.user.uid}
                      canvases={state.canvases}
                      tasks={state.tasks}
                    />
                    <div className="pt-12 border-t border-[#E2E8F0]">
                      <SerendipityEngine state={state} />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

      {/* Toast Interface */}
      <AnimatePresence>
        {(state.error || toast) && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 z-[100] min-w-[320px]",
              (state.error || toast?.type === 'error') ? "bg-[#2D3748] text-white" : "bg-[#8DAA91] text-white"
            )}
          >
            {(state.error || toast?.type === 'error') ? (
              <AlertCircle className="w-5 h-5 text-[#F56565]" />
            ) : (
              <Sparkles className="w-5 h-5 text-white" />
            )}
            <p className="font-medium text-sm">{state.error || toast?.message}</p>
            <button 
              onClick={() => {
                if (state.error) setState(prev => ({ ...prev, error: null }));
                if (toast) setToast(null);
              }} 
              className="ml-auto text-white/50 hover:text-white p-1"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vault Backdrop */}
        <AnimatePresence>
          {showVault && (
            <div className="fixed inset-0 flex items-center justify-center z-[200] p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowVault(false)}
                className="absolute inset-0 bg-[#2D3748]/40 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="relative w-full max-w-xl bg-white rounded-[48px] p-12 shadow-2xl border border-[#E2E8F0]"
              >
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#2D34FB]/5 rounded-2xl flex items-center justify-center">
                      <Lock className="w-7 h-7 text-[#2D34FB]" />
                    </div>
                    <div>
                      <h2 className="font-lexend text-3xl font-bold">Secure Vault</h2>
                      <p className="text-[#718096] font-medium">AES-GCM Encryption Layer</p>
                    </div>
                  </div>
                  <button onClick={() => setShowVault(false)} className="text-[#718096] hover:text-[#2D3748] transition-colors p-2">
                    <Plus className="w-8 h-8 rotate-45" />
                  </button>
                </div>
                
                <VaultInterface 
                  userId={state.user.uid} 
                  initialKey={state.openRouterKey || ''}
                  onClose={() => setShowVault(false)} 
                  onSuccess={(msg) => setToast({ message: msg, type: 'success' })}
                  onSignOut={handleSignOut}
                />

                <div className="mt-12 pt-8 border-t border-[#E2E8F0] flex justify-between items-center">
                  <div className="flex items-center gap-2 text-xs text-[#718096] font-medium">
                    <Activity className="w-4 h-4" />
                    Vault Status: Encrypted
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-[#F56565] font-lexend font-bold text-sm hover:opacity-80 transition-opacity"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Vision Scan Mesh */}
        <RenphoVision 
          userId={state.user.uid}
          isOpen={showVisionScan}
          onClose={() => setShowVisionScan(false)}
          onSuccess={() => setToast({ message: "Health telemetry distilled into vault.", type: 'success' })}
          openRouterKey={state.openRouterKey || ''}
        />

        {/* Task Mesh */}
        <AddTaskModal 
          userId={state.user.uid}
          isOpen={showAddTask}
          onClose={() => setShowAddTask(false)}
        />

        {/* Focus Mode Overlay */}
        <AnimatePresence>
          {showFocusMode && (
            <FocusMode 
              userId={state.user.uid}
              activeTask={activeFocusTask}
              onClose={() => setShowFocusMode(false)}
            />
          )}
        </AnimatePresence>

        {/* Autopilot Engine */}
        <AutopilotEngine state={state} />

        {/* Toast Notifications */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 50, x: "-50%" }}
              className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 z-[500] min-w-[320px] border",
                toast.type === 'error' 
                  ? "bg-[#2D3748] text-white border-red-500/20" 
                  : "bg-white text-[#2D3748] border-[#E2E8F0]"
              )}
            >
              {toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-[#8DAA91]" />
              )}
              <p className="font-lexend font-bold text-xs uppercase tracking-widest">{toast.message}</p>
              <button 
                onClick={() => setToast(null)}
                className="ml-auto p-1 hover:bg-black/5 rounded-lg transition-all"
              >
                <X className="w-4 h-4 text-[#718096]" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Financial Copilot */}
        {state.user && (
          <AIFinancialCopilot 
            transactions={state.transactions} 
            accounts={state.accounts} 
          />
        )}
      </div>
    </LayoutGroup>
  );
}

// Reuse VaultInterface logic from previous version with refined styles
const VaultInterface = ({ 
  userId, 
  initialKey,
  onClose,
  onSuccess,
  onSignOut
}: { 
  userId: string, 
  initialKey: string,
  onClose: () => void,
  onSuccess: (msg: string) => void,
  onSignOut: () => void
}) => {
  const [apiKey, setApiKey] = useState(initialKey);
  const [pillarModels, setPillarModels] = useState<Record<Pillar, string>>({
  finance: 'openai/gpt-4o',
  habits: 'deepseek/deepseek-chat',
  health: 'openai/gpt-4o-mini', // Changed from google/gemini-flash-1.5
  journal: 'anthropic/claude-3.5-sonnet',
  creative: 'deepseek/deepseek-r1',
  professional: 'qwen/qwen-2.5-coder-32b'
  });
  const [isSaving, setIsSaving] = useState(false);

  const modelOptions = [
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'google/gemini-flash-1.5', label: 'Gemini 1.5 Flash' },
    { value: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
    { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
    { value: 'qwen/qwen-2.5-coder-32b', label: 'Qwen 2.5 Coder' }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const encrypted = await encryptKey(apiKey, userId);
      const settings: VaultSettings = {
        openRouterKeyEncrypted: encrypted,
        defaultModel: 'anthropic/claude-3.5-sonnet',
        pillarModelMap: pillarModels
      };
      await setDoc(doc(db, `users/${userId}/settings/vault`), settings);
      onSuccess("Mesh connection established. All pillars secured.");
      onClose();
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#E2E8F0]">
      <div className="space-y-3">
        <label className="block font-lexend text-xs font-bold text-[#2D3748] uppercase tracking-[0.2em]">
          OpenRouter Integration
        </label>
        <div className="relative">
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-[#F9F7F2] border border-[#E2E8F0] rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-[#2D34FB]/10 font-medium transition-all"
            placeholder="sk-or-v1-..."
          />
          <Sparkles className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2D34FB]/40" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(pillarModels) as Pillar[]).map((pillar) => (
          <div key={pillar} className="space-y-2">
            <label className="block font-lexend text-[10px] font-bold text-[#718096] uppercase tracking-widest capitalize">
              {pillar} Specialist
            </label>
            <select
              value={pillarModels[pillar]}
              onChange={(e) => setPillarModels(prev => ({ ...prev, [pillar]: e.target.value }))}
              className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D34FB]/10"
            >
              {modelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving || !apiKey}
        className="w-full bg-[#2D34FB] text-white font-lexend font-bold py-5 rounded-2xl shadow-xl shadow-[#2D34FB]/20 hover:opacity-90 disabled:opacity-50 transition-all"
      >
        {isSaving ? 'Encrypting & Establishing Mesh...' : 'Secure & Synchronize Vault'}
      </button>

      <div className="pt-8 border-t border-[#E2E8F0] flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs text-[#718096] font-medium">
          <Lock className="w-4 h-4" />
          Vault Status: Encrypted
        </div>
        <button 
          onClick={onSignOut}
          className="flex items-center gap-2 text-red-500 font-lexend font-bold text-sm hover:opacity-80 transition-opacity"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};
