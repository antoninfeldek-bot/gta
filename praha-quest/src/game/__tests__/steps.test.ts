import { engine, fresh, T0 } from './fixtures';

describe('steps → XP', () => {
  it('gives 10 XP per full 100 steps and carries the remainder', () => {
    let state = fresh();
    let r = engine.apply(state, { type: 'steps', delta: 150 }, T0);
    expect(r.rewards).toContainEqual({ kind: 'xp', amount: 10, source: 'steps' });
    state = r.newState;
    r = engine.apply(state, { type: 'steps', delta: 50 }, T0);
    expect(r.newState.xp).toBe(20);
    expect(r.newState.daily.steps).toBe(200);
  });

  it('caps XP-counted steps at 15 000 per day but keeps counting steps', () => {
    let state = fresh();
    for (let i = 0; i < 10; i++) state = engine.apply(state, { type: 'steps', delta: 2_000 }, T0).newState;
    expect(state.daily.steps).toBe(20_000);
    expect(state.daily.xpSteps).toBe(15_000);
    expect(state.xp).toBe(1_500 + 0); // 150 chunks × 10 XP (level-up coins do not add XP)
  });

  it('resets the daily counter on a new Prague day', () => {
    let state = fresh();
    state = engine.apply(state, { type: 'steps', delta: 2_000 }, T0).newState;
    const nextDay = T0 + 24 * 3600_000;
    state = engine.apply(state, { type: 'steps', delta: 100 }, nextDay).newState;
    expect(state.daily.steps).toBe(100);
    expect(state.totalSteps).toBe(2_100);
  });

  it('ignores negative and absurd deltas', () => {
    const state = fresh();
    expect(engine.apply(state, { type: 'steps', delta: -50 }, T0).newState.totalSteps).toBe(0);
    expect(engine.apply(state, { type: 'steps', delta: 1e9 }, T0).newState.totalSteps).toBe(2_000);
  });
});
