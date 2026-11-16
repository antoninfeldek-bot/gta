import { GAME_CONFIG } from './config';

const { base, exponent, maxLevel } = GAME_CONFIG.levels;

/** XP needed to advance from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.round(base * Math.pow(level, exponent));
}

/** Lifetime XP at which `level` is reached (level 1 = 0 XP). */
export const LEVEL_THRESHOLDS: readonly number[] = (() => {
  const thresholds = [0, 0];
  for (let level = 1; level < maxLevel; level++) thresholds.push(thresholds[level] + xpToNext(level));
  return thresholds;
})();

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < maxLevel && xp >= LEVEL_THRESHOLDS[level + 1]) level++;
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP earned inside the current level. */
  current: number;
  /** XP the current level needs in total (0 at max level). */
  needed: number;
  /** 0..1 */
  ratio: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  if (level >= maxLevel) return { level, current: 0, needed: 0, ratio: 1 };
  const current = xp - LEVEL_THRESHOLDS[level];
  const needed = xpToNext(level);
  return { level, current, needed, ratio: current / needed };
}
