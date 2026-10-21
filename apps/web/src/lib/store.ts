import { create } from 'zustand';

interface FinanceState {
  isMasked: boolean;
  toggleMask: () => void;
  setMask: (val: boolean) => void;
  currency: string;
  isAiDrawerOpen: boolean;
  openAiDrawer: () => void;
  closeAiDrawer: () => void;
  toggleAiDrawer: () => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  isPlaidModalOpen: boolean;
  openPlaidModal: () => void;
  closePlaidModal: () => void;
  isAddTransactionOpen: boolean;
  openAddTransaction: () => void;
  closeAddTransaction: () => void;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  isMasked: true,
  toggleMask: () => set((state) => ({ isMasked: !state.isMasked })),
  setMask: (val) => set({ isMasked: val }),
  currency: 'CAD',
  isAiDrawerOpen: false,
  openAiDrawer: () => set({ isAiDrawerOpen: true }),
  closeAiDrawer: () => set({ isAiDrawerOpen: false }),
  toggleAiDrawer: () => set((state) => ({ isAiDrawerOpen: !state.isAiDrawerOpen })),
  globalSearch: '',
  setGlobalSearch: (q) => set({ globalSearch: q }),
  isPlaidModalOpen: false,
  openPlaidModal: () => set({ isPlaidModalOpen: true }),
  closePlaidModal: () => set({ isPlaidModalOpen: false }),
  isAddTransactionOpen: false,
  openAddTransaction: () => set({ isAddTransactionOpen: true }),
  closeAddTransaction: () => set({ isAddTransactionOpen: false }),
}));

export const usePrivacyStore = useFinanceStore;

