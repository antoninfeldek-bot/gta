/**
 * Persisted-state migrations. Each entry upgrades a state from version N to
 * N + 1. Never edit a shipped migration; add a new one and bump
 * GAME_CONFIG.schemaVersion.
 */
import { GAME_CONFIG } from './config';
import { createInitialState } from './state';
import type { GameState } from './types';

type AnyState = Record<string, unknown>;

const MIGRATIONS: Record<number, (state: AnyState, now: number) => AnyState> = {
  // v1 stored revealed hexes as a plain array and had no inventory or GPS step remainder.
  1: (state, now) => {
    const cells = Array.isArray(state.revealedHexes) ? (state.revealedHexes as string[]) : [];
    return {
      ...state,
      schemaVersion: 2,
      revealedHexes: Object.fromEntries(cells.map((cell) => [cell, now])),
      inventory: (state.inventory as AnyState | undefined) ?? {},
      gpsStepRemainderM: 0,
    };
  },
};

export function migrateState(persisted: unknown, fromVersion: number, now: number, fallbackSeed: string): GameState {
  if (!persisted || typeof persisted !== 'object') return createInitialState(now, fallbackSeed);
  let state = persisted as AnyState;
  for (let version = fromVersion; version < GAME_CONFIG.schemaVersion; version++) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return createInitialState(now, fallbackSeed);
    state = migrate(state, now);
  }
  // Fill any field a migration forgot, keeping what the player earned.
  return { ...createInitialState(now, fallbackSeed), ...(state as Partial<GameState>), schemaVersion: GAME_CONFIG.schemaVersion };
}
