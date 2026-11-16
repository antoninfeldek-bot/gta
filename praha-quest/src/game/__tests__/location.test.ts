import { cellFor } from '../hex';
import { engine, fix, fresh, NEAR_SQUARE, OLD_TOWN_SQUARE, T0 } from './fixtures';

const loc = (f: ReturnType<typeof fix>, creditGpsSteps = false) => ({ type: 'location' as const, fix: f, creditGpsSteps });

describe('fog of war', () => {
  it('reveals the current hex once for +25 XP', () => {
    const r1 = engine.apply(fresh(), loc(fix(OLD_TOWN_SQUARE, T0)), T0);
    const cell = cellFor(OLD_TOWN_SQUARE.lat, OLD_TOWN_SQUARE.lng);
    expect(r1.rewards).toContainEqual({ kind: 'hexRevealed', cell });
    expect(r1.newState.xp).toBe(25);
    const r2 = engine.apply(r1.newState, loc(fix(OLD_TOWN_SQUARE, T0 + 5_000)), T0 + 5_000);
    expect(r2.rewards).toEqual([]);
  });

  it('fills the path between two nearby fixes', () => {
    let state = engine.apply(fresh(), loc(fix({ lat: 50.0875, lng: 14.415 }, T0)), T0).newState;
    const later = T0 + 5 * 60_000; // 5 min for ~600 m: walking pace
    state = engine.apply(state, loc(fix({ lat: 50.0875, lng: 14.4235 }, later)), later).newState;
    expect(Object.keys(state.revealedHexes).length).toBeGreaterThanOrEqual(3);
  });
});

describe('anti-cheat', () => {
  it('drops inaccurate fixes', () => {
    const r = engine.apply(fresh(), loc(fix(OLD_TOWN_SQUARE, T0, { accuracy: 45 })), T0);
    expect(r.rejected).toBe('accuracy');
    expect(r.newState.xp).toBe(0);
    expect(r.newState.stats.rejectedFixes.accuracy).toBe(1);
  });

  it('drops fixes with no accuracy, stale fixes and fast reported speed', () => {
    expect(engine.apply(fresh(), loc(fix(OLD_TOWN_SQUARE, T0, { accuracy: null })), T0).rejected).toBe('accuracy');
    expect(engine.apply(fresh(), loc(fix(OLD_TOWN_SQUARE, T0 - 60_000)), T0).rejected).toBe('stale');
    expect(engine.apply(fresh(), loc(fix(OLD_TOWN_SQUARE, T0, { speed: 10 })), T0).rejected).toBe('speed');
  });

  it('drops movement faster than 20 km/h', () => {
    const state = engine.apply(fresh(), loc(fix(OLD_TOWN_SQUARE, T0)), T0).newState;
    const t = T0 + 90_000; // 1.5 km in 90 s = 60 km/h
    const r = engine.apply(state, loc(fix({ lat: OLD_TOWN_SQUARE.lat + 0.0135, lng: OLD_TOWN_SQUARE.lng }, t)), t);
    expect(r.rejected).toBe('speed');
  });

  it('drops teleport jumps', () => {
    const state = engine.apply(fresh(), loc(fix(OLD_TOWN_SQUARE, T0)), T0).newState;
    const t = T0 + 10_000;
    expect(engine.apply(state, loc(fix({ lat: 50.03, lng: 14.5 }, t)), t).rejected).toBe('teleport');
  });

  it('starts a new track after a long gap instead of crediting the distance', () => {
    const state = engine.apply(fresh(), loc(fix(OLD_TOWN_SQUARE, T0)), T0).newState;
    const t = T0 + 3 * 3600_000;
    const r = engine.apply(state, loc(fix({ lat: 50.03, lng: 14.5 }, t), true), t);
    expect(r.rejected).toBeUndefined();
    expect(r.newState.totalSteps).toBe(0);
  });
});

describe('GPS step fallback', () => {
  it('converts walked metres to steps at 0.75 m per step', () => {
    let state = engine.apply(fresh(), loc(fix(OLD_TOWN_SQUARE, T0), true), T0).newState;
    const t = T0 + 120_000;
    state = engine.apply(state, loc(fix(NEAR_SQUARE, t), true), t).newState;
    // ~118 m → ~157 steps
    expect(state.totalSteps).toBeGreaterThan(140);
    expect(state.totalSteps).toBeLessThan(175);
  });
});
