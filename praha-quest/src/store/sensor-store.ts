import { create } from 'zustand';

export type Permission = 'unknown' | 'granted' | 'denied';

interface SensorStore {
  permission: Permission;
  /** Latest raw position (shown on the map even if the engine rejected it). */
  position: { lat: number; lng: number; accuracy: number | null } | null;
  /** Bumped by the permission screen to ask again. */
  requestNonce: number;
  set: (patch: Partial<Omit<SensorStore, 'set' | 'askAgain'>>) => void;
  askAgain: () => void;
}

export const useSensorStore = create<SensorStore>((set) => ({
  permission: 'unknown',
  position: null,
  requestNonce: 0,
  set: (patch) => set(patch),
  askAgain: () => set((s) => ({ requestNonce: s.requestNonce + 1 })),
}));
