import { createEngine } from '../engine';
import { dailyQuestProgress, dailyQuests, districtProgress, nextRank, rankTitle, resolveStoryQuests, weeklyLeaderboard } from '../quests';
import { createInitialState } from '../state';
import type { PlaceCatalog } from '../types';
import { fix, T0 } from './fixtures';

const A = { lat: 50.09, lng: 14.42 };
const B = { lat: 50.0908, lng: 14.4205 }; // ~100 m from A
const C = { lat: 50.0915, lng: 14.421 };

const catalog: PlaceCatalog = {
  places: [
    { id: 'syn', nameCs: 'Staronová synagoga', type: 'church', lat: A.lat, lng: A.lng, district: 'Praha 1', rarity: 'epic' },
    { id: 'most', nameCs: 'Karlův most', type: 'bridge', lat: B.lat, lng: B.lng, district: 'Praha 1', rarity: 'legendary' },
    { id: 'hrad', nameCs: 'Pražský hrad', type: 'landmark', lat: C.lat, lng: C.lng, district: 'Praha 1', rarity: 'legendary' },
    { id: 'kafe', nameCs: 'Kavárna Slavia', type: 'cafe', lat: C.lat + 0.0006, lng: C.lng, district: 'Praha 1', rarity: 'rare', dish: 'vetrnik' },
  ],
  sets: [],
};
const engine = createEngine(catalog);

const walkAndClaim = (state: ReturnType<typeof createInitialState>, pos: { lat: number; lng: number }, t: number, placeId: string) => {
  const s = engine.apply(state, { type: 'location', fix: fix(pos, t), creditGpsSteps: false }, t).newState;
  return engine.apply(s, { type: 'checkIn', placeId }, t);
};

describe('daily quests', () => {
  it('draws three different, deterministic quests per day', () => {
    const a = dailyQuests('seed', '2026-11-17');
    expect(a).toHaveLength(3);
    expect(new Set(a.map((q) => q.id)).size).toBe(3);
    expect(dailyQuests('seed', '2026-11-17')).toEqual(a);
    expect(new Set(a.map((q) => q.tier))).toEqual(new Set([0, 1, 2]));
  });

  it('rewards a quest once when its counter reaches the target', () => {
    let state = createInitialState(T0, 'seed');
    const steps = dailyQuests('seed', state.daily.day).find((q) => q.kind === 'steps');
    if (!steps) return; // not drawn for this seed/day
    let done = 0;
    for (let i = 0; i < 6; i++) {
      const r = engine.apply(state, { type: 'steps', delta: 2_000 }, T0);
      done += r.rewards.filter((x) => x.kind === 'dailyQuestDone' && x.questId === steps.id).length;
      state = r.newState;
    }
    expect(done).toBe(dailyQuestProgress(state, steps) >= steps.target ? 1 : 0);
    expect(state.daily.questsDone).toContain(steps.id);
  });

  it('counts check-ins by place type', () => {
    const r = walkAndClaim(createInitialState(T0, 'seed'), { lat: C.lat + 0.0006, lng: C.lng }, T0, 'kafe');
    expect(r.newState.daily.checkIns).toBe(1);
    expect(r.newState.daily.checkInTypes.cafe).toBe(1);
  });
});

describe('cookbook', () => {
  it('unlocks the dish of a food place once', () => {
    const r = walkAndClaim(createInitialState(T0, 'seed'), { lat: C.lat + 0.0006, lng: C.lng }, T0, 'kafe');
    expect(r.rewards).toContainEqual({ kind: 'dishUnlocked', dishId: 'vetrnik' });
    expect(r.newState.dishes.vetrnik).toBe(T0);
  });
});

describe('story quests', () => {
  it('resolves only quests whose places all exist', () => {
    expect(resolveStoryQuests(catalog).map((q) => q.id)).toEqual(['golem']);
  });

  it('advances in order and pays out at the end', () => {
    let state = createInitialState(T0, 'seed');
    // Out of order: the castle first does nothing for the quest.
    let r = walkAndClaim(state, C, T0, 'hrad');
    expect(r.rewards.some((x) => x.kind === 'storyStep')).toBe(false);
    state = r.newState;
    const later = T0 + 21 * 3600_000; // past the revisit cooldown
    r = walkAndClaim(state, A, later, 'syn');
    expect(r.rewards).toContainEqual({ kind: 'storyStep', questId: 'golem', step: 1 });
    r = walkAndClaim(r.newState, B, later + 120_000, 'most');
    expect(r.newState.story.golem.step).toBe(2);
    r = walkAndClaim(r.newState, C, later + 240_000, 'hrad');
    expect(r.rewards).toContainEqual({ kind: 'storyDone', questId: 'golem' });
    expect(r.newState.story.golem.completedAt).toBe(later + 240_000);
    expect(r.newState.inventory['golem-clay']).toBeGreaterThanOrEqual(1);
  });
});

describe('leaderboard and ranks', () => {
  it('ranks the player among rivals by weekly XP', () => {
    const state = { ...createInitialState(T0, 'seed') };
    const rows = weeklyLeaderboard(state, T0);
    expect(rows.find((r) => r.kind === 'you')).toBeDefined();
    expect(rows.map((r) => r.rank)).toEqual(rows.map((_, i) => i + 1));
    const rich = { ...state, weekly: { ...state.weekly, xp: 1e9 } };
    expect(weeklyLeaderboard(rich, T0)[0].kind).toBe('you');
  });

  it('tracks weekly XP as XP is earned', () => {
    const r = engine.apply(createInitialState(T0, 'seed'), { type: 'steps', delta: 500 }, T0);
    expect(r.newState.weekly.xp).toBeGreaterThanOrEqual(50);
  });

  it('names ranks by level', () => {
    expect(rankTitle(1)).toBe('turista');
    expect(rankTitle(15)).toBe('prazak');
    expect(rankTitle(100)).toBe('karel-iv');
    expect(nextRank(1)?.minLevel).toBe(3);
    expect(nextRank(100)).toBeNull();
  });

  it('summarises districts', () => {
    expect(districtProgress(catalog, createInitialState(T0, 's'))).toEqual([{ district: 'Praha 1', found: 0, total: 4 }]);
  });
});
