/**
 * Daily quests, story side quests, the weekly rival leaderboard, rank titles
 * and district progress. Pure functions over GameState + catalogue.
 */
import { DAILY_QUEST_POOL, GAME_CONFIG, RANK_TITLES, RIVALS, STORY_QUESTS } from './config';
import { createRng } from './rng';
import { gameWeek, weekProgress } from './time';
import type { GameState, PlaceCatalog, PlaceType } from './types';

export interface DailyQuest {
  /** Stable within a day, e.g. "steps-1". */
  id: string;
  kind: (typeof DAILY_QUEST_POOL)[number]['kind'];
  placeType?: PlaceType;
  tier: 0 | 1 | 2;
  target: number;
  xp: number;
  coins: number;
}

/** Today's quests: three different templates, tiers easy / medium / hard in random order. */
export function dailyQuests(playerSeed: string, day: string): DailyQuest[] {
  const rng = createRng(`${playerSeed}|daily|${day}`);
  const pool = [...DAILY_QUEST_POOL];
  const tiers: (0 | 1 | 2)[] = [0, 1, 2].sort(() => rng() - 0.5) as (0 | 1 | 2)[];
  const picked: DailyQuest[] = [];
  for (let i = 0; i < GAME_CONFIG.daily.questsPerDay && pool.length > 0; i++) {
    const template = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const tier = tiers[i % tiers.length];
    const placeType = 'placeType' in template ? (template.placeType as PlaceType) : undefined;
    picked.push({
      id: `${template.kind}${placeType ? `-${placeType}` : ''}-${tier}`,
      kind: template.kind,
      placeType,
      tier,
      target: template.targets[tier],
      xp: GAME_CONFIG.daily.tierXp[tier],
      coins: GAME_CONFIG.daily.tierCoins[tier],
    });
  }
  return picked;
}

export function dailyQuestProgress(state: GameState, quest: DailyQuest): number {
  const d = state.daily;
  switch (quest.kind) {
    case 'steps':
      return d.steps;
    case 'hexes':
      return d.hexes;
    case 'checkIns':
      return d.checkIns;
    case 'checkInType':
      return quest.placeType ? (d.checkInTypes[quest.placeType] ?? 0) : 0;
  }
}

export interface StoryQuest {
  id: (typeof STORY_QUESTS)[number]['id'];
  stepPlaceIds: string[];
  xp: number;
  coins: number;
  itemId: string | null;
}

/** Story quests whose every step exists in this catalogue (matched by Czech name). */
export function resolveStoryQuests(catalog: PlaceCatalog): StoryQuest[] {
  const byName = new Map(catalog.places.map((p) => [p.nameCs, p.id]));
  const resolved: StoryQuest[] = [];
  for (const q of STORY_QUESTS) {
    const ids = q.steps.map((name) => byName.get(name));
    if (ids.some((id) => !id)) continue;
    resolved.push({ id: q.id, stepPlaceIds: ids as string[], xp: q.xp, coins: q.coins, itemId: q.itemId });
  }
  return resolved;
}

export interface LeaderboardRow {
  id: string;
  /** 'you' for the player, otherwise a rival id. */
  kind: 'you' | 'rival';
  xp: number;
  rank: number;
}

/**
 * This week's standings. Rivals pace through the week toward their weekly
 * total with a little deterministic day-to-day jitter.
 */
export function weeklyLeaderboard(state: GameState, now: number): LeaderboardRow[] {
  const week = gameWeek(now);
  const progress = weekProgress(now);
  const youXp = state.weekly.week === week ? state.weekly.xp : 0;
  const rows: Omit<LeaderboardRow, 'rank'>[] = RIVALS.map((r) => {
    const rng = createRng(`${state.playerSeed}|rival|${r.id}|${week}`);
    const jitter = 1 + (rng() * 2 - 1) * GAME_CONFIG.leaderboard.rivalsJitter;
    // Ease-in-out pacing: quiet starts, busy weekends.
    const eased = progress * progress * (3 - 2 * progress);
    return { id: r.id, kind: 'rival' as const, xp: Math.round(r.weeklyXp * jitter * eased) };
  });
  rows.push({ id: 'you', kind: 'you', xp: youXp });
  return rows
    .sort((a, b) => b.xp - a.xp || (a.kind === 'you' ? -1 : 1))
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export function rankTitle(level: number): (typeof RANK_TITLES)[number]['id'] {
  let id: (typeof RANK_TITLES)[number]['id'] = RANK_TITLES[0].id;
  for (const t of RANK_TITLES) if (level >= t.minLevel) id = t.id;
  return id;
}

/** Next rank and the level it needs, or null at the top. */
export function nextRank(level: number): { id: (typeof RANK_TITLES)[number]['id']; minLevel: number } | null {
  return RANK_TITLES.find((t) => t.minLevel > level) ?? null;
}

export interface DistrictProgress {
  district: string;
  found: number;
  total: number;
}

/** Discovered places per Prague district, best first. Places without a district are skipped. */
export function districtProgress(catalog: PlaceCatalog, state: GameState): DistrictProgress[] {
  const map = new Map<string, DistrictProgress>();
  for (const p of catalog.places) {
    if (!p.district || p.district === 'Praha') continue;
    const row = map.get(p.district) ?? { district: p.district, found: 0, total: 0 };
    row.total++;
    if (state.places[p.id]) row.found++;
    map.set(p.district, row);
  }
  return [...map.values()].sort((a, b) => b.found / b.total - a.found / a.total || b.total - a.total);
}
