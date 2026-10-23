import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { tokens } from "@financeos/design-tokens";

export { tokens };

/**
 * API server. Set EXPO_PUBLIC_API_URL (e.g. https://financeos.example.com/api) for
 * real devices and production builds. In development it falls back to the local
 * Next.js server: 10.0.2.2 is the Android emulator's alias for the host machine.
 */
function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  const configured = fromEnv || fromConfig;
  if (configured) return configured.replace(/\/$/, "");
  return Platform.OS === "android" ? "http://10.0.2.2:3000/api" : "http://localhost:3000/api";
}

export const API_BASE = resolveApiBase();

export interface MobileAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  type: "bank" | "credit_card";
  balance: number;
  credit_limit?: number;
}

export interface MobileTransaction {
  id: string;
  date: string;
  description: string;
  merchant: string;
  category: string;
  amount: number;
  status: "posted" | "pending";
}

// ---------- Session ----------

const TOKEN_KEY = "financeos.session";

type SessionState = {
  token: string | null;
  ready: boolean;
  load: () => Promise<void>;
  signIn: (passcode: string) => Promise<void>;
  signOut: () => Promise<void>;
};

/** The signed session token lives in the device keychain; the passcode is never stored. */
export const useSession = create<SessionState>((set) => ({
  token: null,
  ready: false,
  load: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    set({ token, ready: true });
  },
  signIn: async (passcode: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, client: "mobile" }),
      });
    } catch {
      throw new Error("Can't reach FinanceOS. Check your connection and try again.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) {
      throw new Error(data.error || "Sign-in failed. Try again.");
    }
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    set({ token: data.token });
  },
  signOut: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await AsyncStorage.multiRemove(Object.values(CACHE_KEYS)).catch(() => {});
    set({ token: null });
  },
}));

// ---------- Sync status ----------

type SyncState = {
  source: "live" | "cache" | "none";
  syncedAt: string | null;
  setStatus: (source: SyncState["source"], syncedAt: string | null) => void;
};

/** Tells screens whether they're showing live data or the last saved copy. */
export const useSyncStatus = create<SyncState>((set) => ({
  source: "none",
  syncedAt: null,
  setStatus: (source, syncedAt) => set({ source, syncedAt }),
}));

const CACHE_KEYS = {
  accounts: "financeos.cache.accounts",
  transactions: "financeos.cache.transactions",
  bills: "financeos.cache.bills",
};

export interface MobileBill {
  id: string;
  name: string;
  amount: number;
  type: string;
  due_day: number;
  next_due_date: string;
  is_paid: boolean;
  autopay: boolean;
}

type Cached<T> = { data: T; syncedAt: string };

async function readCache<T>(key: string): Promise<Cached<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Cached<T>) : null;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, data: T): Promise<string> {
  const syncedAt = new Date().toISOString();
  await AsyncStorage.setItem(key, JSON.stringify({ data, syncedAt })).catch(() => {});
  return syncedAt;
}

/**
 * Fetches from the API with the session token. A 401 signs the user out so the
 * app returns to the login screen. Network failures fall back to the last saved
 * copy (marked as cached), never to made-up data.
 */
async function getWithCache<T>(path: string, cacheKey: string, pick: (json: any) => T | null): Promise<T | null> {
  const { token, signOut } = useSession.getState();
  const { setStatus } = useSyncStatus.getState();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
    });
    if (res.status === 401) {
      await signOut();
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = pick(await res.json());
    if (data === null) throw new Error("Unexpected response");
    const syncedAt = await writeCache(cacheKey, data);
    setStatus("live", syncedAt);
    return data;
  } catch {
    const cached = await readCache<T>(cacheKey);
    setStatus(cached ? "cache" : "none", cached?.syncedAt ?? null);
    return cached?.data ?? null;
  }
}

export async function fetchAccounts(): Promise<MobileAccount[]> {
  const data = await getWithCache<MobileAccount[]>("/accounts", CACHE_KEYS.accounts, (json) =>
    json?.success && Array.isArray(json.accounts) ? json.accounts : null
  );
  return data ?? [];
}

export async function fetchTransactions(): Promise<MobileTransaction[]> {
  const data = await getWithCache<MobileTransaction[]>("/transactions?limit=50", CACHE_KEYS.transactions, (json) =>
    json?.success && Array.isArray(json.transactions) ? json.transactions : null
  );
  return data ?? [];
}

export async function fetchBills(): Promise<MobileBill[]> {
  const data = await getWithCache<MobileBill[]>("/bills", CACHE_KEYS.bills, (json) =>
    json?.success && Array.isArray(json.bills) ? json.bills : null
  );
  return data ?? [];
}

/** Marks a bill paid on the server, which records the payment and moves the due date forward. */
export async function payBill(id: string): Promise<void> {
  const { token, signOut } = useSession.getState();
  if (!token) throw new Error("Sign in to pay bills.");
  const res = await fetch(`${API_BASE}/bills/${encodeURIComponent(id)}/pay`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ create_transaction: true }),
  });
  if (res.status === 401) {
    await signOut();
    throw new Error("Your session expired. Sign in again.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Couldn't mark this bill paid.");
  }
}
