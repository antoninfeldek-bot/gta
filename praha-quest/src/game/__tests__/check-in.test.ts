import { GAME_CONFIG } from '../config';
import { rollLoot } from '../loot';
import { engine, fix, fresh, NEAR_SQUARE, OLD_TOWN_SQUARE, T0 } from './fixtures';

const at = (pos: { lat: number; lng: number }, t: number, state = fresh()) =>
  engine.apply(state, { type: 'location', fix: fix(pos, t), creditGpsSteps: false }, t).newState;

describe('check-in', () => {
  it('needs a recent fix inside the radius', () => {
    expect(engine.apply(fresh(), { type: 'checkIn', placeId: 'square' }, T0).checkInFailure).toBe('noFix');
    const state = at(NEAR_SQUARE, T0);
    expect(engine.apply(state, { type: 'checkIn', placeId: 'square' }, T0).checkInFailure).toBe('tooFar');
    expect(engine.apply(state, { type: 'checkIn', placeId: 'nope' }, T0).checkInFailure).toBe('unknownPlace');
    expect(engine.apply(state, { type: 'checkIn', placeId: 'near' }, T0 + 60_000).checkInFailure).toBe('noFix');
  });

  it('grants discovery XP by rarity plus loot on the first visit', () => {
    const state = at(OLD_TOWN_SQUARE, T0);
    const r = engine.apply(state, { type: 'checkIn', placeId: 'square' }, T0);
    expect(r.rewards[0]).toEqual({ kind: 'placeDiscovered', placeId: 'square' });
    expect(r.rewards).toContainEqual({ kind: 'xp', amount: GAME_CONFIG.places.discoverXp.legendary, source: 'place' });
    // Legendary places always drop a relic.
    expect(r.rewards.some((x) => x.kind === 'item')).toBe(true);
    expect(r.newState.places.square.visits).toBe(1);
  });

  it('enforces the revisit cooldown, then pays the reduced revisit XP', () => {
    let state = at(OLD_TOWN_SQUARE, T0);
    state = engine.apply(state, { type: 'checkIn', placeId: 'square' }, T0).newState;
    expect(engine.apply(state, { type: 'checkIn', placeId: 'square' }, T0 + 1_000).checkInFailure).toBe('cooldown');
    const later = T0 + GAME_CONFIG.places.revisitCooldownMs + 1_000;
    state = at(OLD_TOWN_SQUARE, later, state);
    const r = engine.apply(state, { type: 'checkIn', placeId: 'square' }, later);
    expect(r.rewards[0]).toEqual({ kind: 'placeRevisited', placeId: 'square' });
    expect(r.rewards).toContainEqual({ kind: 'xp', amount: 200, source: 'place' });
  });

  it('completes a set exactly once', () => {
    let state = at(OLD_TOWN_SQUARE, T0);
    state = engine.apply(state, { type: 'checkIn', placeId: 'square' }, T0).newState;
    const t = T0 + 120_000;
    state = at(NEAR_SQUARE, t, state);
    const r = engine.apply(state, { type: 'checkIn', placeId: 'near' }, t);
    expect(r.rewards).toContainEqual({ kind: 'setCompleted', setId: 'pair' });
    expect(r.rewards).toContainEqual({ kind: 'xp', amount: 1_000 + 40 * 2, source: 'set' });
    expect(r.newState.completedSets.pair).toBe(t);
  });

  it('rolls deterministic loot', () => {
    const place = { id: 'square', rarity: 'rare' as const };
    expect(rollLoot('s', place, '2026-11-16', 1)).toEqual(rollLoot('s', place, '2026-11-16', 1));
    const [min, max] = GAME_CONFIG.loot.coins.rare;
    for (let v = 1; v < 50; v++) {
      const { coins } = rollLoot('s', place, '2026-11-16', v);
      expect(coins).toBeGreaterThanOrEqual(min);
      expect(coins).toBeLessThanOrEqual(max);
    }
  });

  it('does not mutate the input state', () => {
    const state = at(OLD_TOWN_SQUARE, T0);
    const snapshot = JSON.stringify(state);
    engine.apply(state, { type: 'checkIn', placeId: 'square' }, T0);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe('level-ups', () => {
  it('emits levelUp and level coins when XP crosses a threshold', () => {
    const state = at(OLD_TOWN_SQUARE, T0);
    const r = engine.apply(state, { type: 'checkIn', placeId: 'square' }, T0);
    const levels = r.rewards.filter((x) => x.kind === 'levelUp');
    expect(levels.length).toBeGreaterThan(0);
    expect(r.newState.level).toBe(levels.length + 1);
  });
});
