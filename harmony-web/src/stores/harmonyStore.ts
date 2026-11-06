import { create } from 'zustand';
import { ConnectionState, HarmonyDevice } from '../lib/wsNearLinkSim';

interface HarmonyStoreState {
  connectionState: ConnectionState;
  devices: HarmonyDevice[];
  isSyncing: boolean;
  wsConnected: boolean;
  lastSyncTime: number | null;
  sanitizeResult: {
    original: string;
    sanitized: string;
    fields_sanitized: number;
    rules_applied: string[];
  } | null;

  setConnectionState: (state: ConnectionState) => void;
  setDevices: (devices: HarmonyDevice[]) => void;
  setIsSyncing: (syncing: boolean) => void;
  setWsConnected: (connected: boolean) => void;
  setLastSyncTime: (time: number) => void;
  setSanitizeResult: (result: HarmonyStoreState['sanitizeResult']) => void;
  reset: () => void;
}

const initialState = {
  connectionState: 'disconnected' as ConnectionState,
  devices: [] as HarmonyDevice[],
  isSyncing: false,
  wsConnected: false,
  lastSyncTime: null as number | null,
  sanitizeResult: null as HarmonyStoreState['sanitizeResult'],
};

export const useHarmonyStore = create<HarmonyStoreState>((set) => ({
  ...initialState,

  setConnectionState: (connectionState) => set({ connectionState }),
  setDevices: (devices) => set({ devices }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setSanitizeResult: (sanitizeResult) => set({ sanitizeResult }),
  reset: () => set(initialState),
}));
