import { GAME_CONFIG } from '../config';
import { migrateState } from '../migrations';
import { T0 } from './fixtures';

describe('migrations', () => {
  it('upgrades a v1 save without losing progress', () => {
    const v1 = { schemaVersion: 1, playerSeed: 'abc', xp: 500, level: 3, coins: 7, revealedHexes: ['891e3550a6bffff'] };
    const state = migrateState(v1, 1, T0, 'fallback');
    expect(state.schemaVersion).toBe(GAME_CONFIG.schemaVersion);
    expect(state.xp).toBe(500);
    expect(state.playerSeed).toBe('abc');
    expect(state.revealedHexes).toEqual({ '891e3550a6bffff': T0 });
    expect(state.inventory).toEqual({});
  });

  it('falls back to a fresh state for garbage', () => {
    expect(migrateState(null, 1, T0, 'seed').xp).toBe(0);
    expect(migrateState({}, -5, T0, 'seed').playerSeed).toBe('seed');
  });
});
