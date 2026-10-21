/**
 * HABITRAGE Master Type Definitions
 */

export type Pillar = 'finance' | 'habits' | 'health' | 'journal' | 'creative' | 'professional';

export interface VaultSettings {
  openRouterKeyEncrypted: string;
  defaultModel: string;
  pillarModelMap: Record<Pillar, string>;
}

export interface Account {
  accountId: string;
  name: string;
  type: 'credit_card' | 'bank_checking' | 'savings';
  institution: string;
  principalBalance: number;
  startingBalance?: number;
  creditLimit?: number;
  aprPercentage?: number;
  statementClosingDay?: number;
  dueDate?: string;
  minimumPayment?: number;
  lastStatementBalance?: number;
  activeInstallments?: number;
  sourceFileName?: string;
}

export interface Transaction {
  txId: string;
  accountId: string;
  amount: number;
  type: 'expense' | 'income' | 'internal_transfer';
  category: string;
  subcategory?: string;
  merchant?: string;
  timestamp: string;
  statementMonth?: string;
  isImpulse: boolean;
  receiptStoragePath?: string;
  status?: string;
  notes?: string;
}

export interface Task {
  taskId: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed';
  energyTag: 'low' | 'medium' | 'deep_work';
  dueDate: string;
  originalDueDate: string;
  rescheduleCount: number;
  linkedCanvasId?: string;
}

export interface Habit {
  habitId: string;
  title: string;
  frequency: 'daily' | 'weekly';
  targetValue: number;
  completionLog: Record<string, boolean>;
}

export interface HealthLog {
  logId: string;
  date: string;
  // Renpho (Body Composition)
  weightKg?: number;
  bmi?: number;
  bodyFatPct?: number;
  skeletalMusclePct?: number;
  fatFreeMassKg?: number;
  subcutaneousFatPct?: number;
  visceralFatGrade?: number;
  bodyWaterPct?: number;
  muscleMassKg?: number;
  boneMassKg?: number;
  proteinPct?: number;
  bmrKcal?: number;
  metabolicAge?: number;
  // Health Connect (Activity)
  steps?: number;
  kmWalked?: number;
  activeCaloriesBurned?: number;
  restingHeartRate?: number;
  sleepHours?: number;
  recoveryScore?: number;
}

export interface JournalEntry {
  entryId: string;
  text: string;
  sentimentScore?: number;
  extractedActionItems?: string[];
  timestamp: string;
}

export interface Canvas {
  canvasId: string;
  title: string;
  excalidrawSceneJson: string;
  lastUpdated: string;
  linkedTaskId?: string;
}

export interface Milestone {
  milestoneId: string;
  title: string;
  description: string;
  targetDate: string;
  completedDate?: string;
  status: 'pending' | 'achieved';
}

export interface AutopilotLog {
  logId: string;
  type: 'health_recovery' | 'financial_stress' | 'journal_distillation' | 'yield_optimization';
  message: string;
  timestamp: string;
  impact: 'low' | 'medium' | 'high';
}

export type PayCycle = 'weekly' | 'bi_weekly' | 'semi_monthly' | 'monthly';
export type DeductionType = 'fixed_per_paycheck' | 'fixed_per_hour' | 'percentage_gross';

export interface Role {
  roleId: string;
  roleName: string;
  hourlyRate: number;
}

export interface CustomDeduction {
  deductionId: string;
  name: string;
  type: DeductionType;
  value: number;
}

export interface EmployerConfig {
  employerId: string;
  name: string;
  payCycle: PayCycle;
  payPeriodAnchorDate: string;
  roles: Role[];
  taxProfile: {
    federalClaimAmount: number;
    provincialClaimAmount: number;
    cppExemptionEnabled: boolean;
    eiRatePct: number;
  };
  customDeductions: CustomDeduction[];
  vacationAccrualPct: number;
  color?: string;
}

export interface Shift {
  shiftId: string;
  employerId: string;
  roleId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  scheduledHours: number;
  breakMinutes?: number;
  hourlyRateOverride?: number;
  netEstimatedPay: number;
  grossEstimatedPay: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  gcalEventId?: string;
}

export interface CanadianProvince {
  code: string;
  name: string;
}

export interface AppState {
  user: any;
  vault: VaultSettings | null;
  accounts: Account[];
  tasks: Task[];
  healthLogs: HealthLog[];
  journalEntries: JournalEntry[];
  transactions: Transaction[];
  shifts: Shift[];
  canvases: Canvas[];
  milestones: Milestone[];
  autopilotLogs: AutopilotLog[];
  openRouterKey: string | null;
  googleAccessToken: string | null;
  employers: EmployerConfig[];
  professionalSettings: any | null; // Keep for legacy if needed, but primary is employers
  loading: boolean;
  error: string | null;
}
