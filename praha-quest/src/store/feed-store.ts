import { create } from 'zustand';
import { APP_CONFIG } from '@/app-config';
import type { PlaceRarity } from '@/game';

export type ToastTone = 'xp' | 'place' | 'item' | 'set' | 'quest' | 'food' | 'warn';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
  rarity?: PlaceRarity;
  /** Short exclamation shown before the title ("No teda!"). */
  cheer?: string;
}

interface FeedStore {
  toasts: Toast[];
  /** Level reached, shown as a full-screen moment until dismissed. */
  levelUp: number | null;
  push: (toast: Omit<Toast, 'id'>) => void;
  drop: (id: number) => void;
  showLevelUp: (level: number) => void;
  dismissLevelUp: () => void;
}

let nextId = 1;

export const useFeedStore = create<FeedStore>((set) => ({
  toasts: [],
  levelUp: null,
  push: (toast) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }].slice(-APP_CONFIG.maxToasts) }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), APP_CONFIG.toastMs);
  },
  drop: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  showLevelUp: (level) => set((s) => ({ levelUp: Math.max(level, s.levelUp ?? 0) })),
  dismissLevelUp: () => set({ levelUp: null }),
}));
