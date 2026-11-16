import type { Reward } from '@/game';

type Listener = (rewards: Reward[]) => void;
const listeners = new Set<Listener>();

/** Fire-and-forget channel from the store to feedback (toasts, SFX, haptics). */
export function emitRewards(rewards: Reward[]) {
  for (const l of listeners) l(rewards);
}

export function onRewards(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
