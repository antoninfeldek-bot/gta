import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { catalog } from '@/data/catalog';
import {
  createEngine,
  createInitialState,
  GAME_CONFIG,
  migrateState,
  type ApplyResult,
  type GameEvent,
  type GameState,
} from '@/game';
import { emitRewards } from '@/services/reward-bus';

export const engine = createEngine(catalog);

const newSeed = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export interface Settings {
  sound: boolean;
  haptics: boolean;
  simulate: boolean;
}

export type StepSource = 'pedometer' | 'gps' | 'unknown';

interface GameStore {
  game: GameState;
  settings: Settings;
  /** Runtime only (not persisted). */
  stepSource: StepSource;
  simTarget: { lat: number; lng: number } | null;
  lastReject: { reason: string; at: number } | null;
  dispatch: (event: GameEvent) => ApplyResult;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setStepSource: (source: StepSource) => void;
  setSimTarget: (target: { lat: number; lng: number } | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: createInitialState(Date.now(), newSeed()),
      settings: { sound: true, haptics: true, simulate: false },
      stepSource: 'unknown',
      simTarget: null,
      lastReject: null,
      dispatch: (event) => {
        const now = Date.now();
        const result = engine.apply(get().game, event, now);
        set({
          game: result.newState,
          ...(result.rejected ? { lastReject: { reason: result.rejected, at: now } } : {}),
        });
        if (result.rewards.length > 0) emitRewards(result.rewards);
        return result;
      },
      setSetting: (key, value) =>
        set({
          settings: { ...get().settings, [key]: value },
          // Switching between real and simulated movement breaks the GPS track,
          // otherwise the jump between them would read as a teleport.
          ...(key === 'simulate' ? { game: { ...get().game, lastFix: null }, simTarget: null } : {}),
        }),
      setStepSource: (stepSource) => set({ stepSource }),
      setSimTarget: (simTarget) => set({ simTarget }),
      reset: () => set({ game: createInitialState(Date.now(), newSeed()), simTarget: null }),
    }),
    {
      name: 'praha-quest',
      version: GAME_CONFIG.schemaVersion,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ game: s.game, settings: s.settings }),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as { game?: unknown; settings?: Settings };
        return { ...p, game: migrateState(p.game, version, Date.now(), newSeed()) };
      },
    },
  ),
);
