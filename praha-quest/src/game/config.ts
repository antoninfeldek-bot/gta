/**
 * Every tunable game number lives here. Nothing in src/game/ may hard-code a
 * reward, radius, rate or cooldown — import it from this file instead, so the
 * same values can later be served by the backend.
 */
import type { PlaceRarity } from './types';

export const GAME_CONFIG = {
  /** Persisted state schema version. Bump together with a migration in migrations.ts. */
  schemaVersion: 3,

  /** Time zone that defines a "game day" (daily caps, cooldown days, loot seeds). */
  timeZone: 'Europe/Prague',

  hex: {
    /** H3 resolution of the exploration grid (~0.1 km² per cell). */
    resolution: 9,
    /** XP for revealing a hex for the first time. */
    revealXp: 25,
    /**
     * When two consecutive valid fixes are this many cells apart or fewer,
     * every cell on the straight path between them is revealed too, so a fast
     * walk does not leave holes in the map.
     */
    maxPathFillDistance: 3,
  },

  steps: {
    /** Steps per XP chunk… */
    stepsPerChunk: 100,
    /** …and the XP that chunk is worth. */
    xpPerChunk: 10,
    /** Steps per game day that still count toward XP. */
    dailyXpCap: 15_000,
    /** GPS fallback when no pedometer is available. */
    metersPerStep: 0.75,
    /** Largest single step delta accepted from the pedometer (guards sensor glitches). */
    maxDeltaPerEvent: 2_000,
  },

  antiCheat: {
    /** Fixes less accurate than this are ignored. */
    maxAccuracyM: 30,
    /** Fixes implying a faster movement than this are ignored. */
    maxSpeedKmh: 20,
    /** A jump longer than this… */
    teleportDistanceM: 400,
    /** …within this time window is a teleport, whatever the implied speed. */
    teleportWindowMs: 60_000,
    /** A fix older than this (relative to `now`) is stale and ignored. */
    maxFixAgeMs: 30_000,
    /**
     * After a gap this long the next fix starts a new track: it is accepted,
     * but the distance to the previous fix is not credited as walked.
     */
    trackResetGapMs: 10 * 60_000,
  },

  levels: {
    maxLevel: 100,
    /** XP needed to go from level L to L+1 = round(base * L^exponent). */
    base: 100,
    exponent: 1.5,
    /** Coins granted on reaching level L = coinsPerLevel * L. */
    coinsPerLevel: 20,
  },

  places: {
    /** You must be this close to a place to claim it. */
    checkInRadiusM: 40,
    /** "Nearby" list in the UI. */
    nearbyRadiusM: 600,
    /** A place can be claimed again after this cooldown. */
    revisitCooldownMs: 20 * 60 * 60_000,
    /** First-visit XP by rarity. */
    discoverXp: { common: 60, rare: 150, epic: 400, legendary: 1_000 } satisfies Record<PlaceRarity, number>,
    /** Revisit XP as a fraction of the first-visit XP. */
    revisitXpFactor: 0.2,
  },

  sets: {
    /** Set completion XP = baseXp + perPlaceXp * set size. */
    baseXp: 1_000,
    perPlaceXp: 40,
    /** Set completion coins = baseCoins + perPlaceCoins * set size. */
    baseCoins: 200,
    perPlaceCoins: 10,
  },

  daily: {
    /** Quests offered per day. */
    questsPerDay: 3,
    /** Reward per quest difficulty tier (0 = easy … 2 = hard). */
    tierXp: [80, 160, 300],
    tierCoins: [15, 30, 60],
    /** Bonus for finishing all of today's quests = base × min(streak, cap). */
    allDoneXpBase: 100,
    allDoneCoinsBase: 20,
    streakCap: 7,
  },

  story: {
    /** XP for each step of a story quest except the last. */
    stepXp: 50,
  },

  leaderboard: {
    /** Weeks start on Monday (game time zone). */
    rivalsJitter: 0.25,
  },

  /**
   * Loot rolled on every successful check-in. Rolls are deterministic
   * (seeded by player, place and game day), so the server can verify them.
   */
  loot: {
    coins: {
      common: [5, 15],
      rare: [15, 40],
      epic: [40, 90],
      legendary: [100, 200],
    } satisfies Record<PlaceRarity, readonly [number, number]>,
    /** Chance of an extra relic drop, by place rarity. */
    relicChance: { common: 0.15, rare: 0.3, epic: 0.55, legendary: 1 } satisfies Record<PlaceRarity, number>,
    /** Weighted relic table per place rarity. Weights are relative. */
    relicTable: {
      common: [
        { itemId: 'tram-ticket', weight: 60 },
        { itemId: 'trdelnik', weight: 30 },
        { itemId: 'old-map', weight: 10 },
      ],
      rare: [
        { itemId: 'trdelnik', weight: 35 },
        { itemId: 'old-map', weight: 40 },
        { itemId: 'alchemist-vial', weight: 25 },
      ],
      epic: [
        { itemId: 'old-map', weight: 25 },
        { itemId: 'alchemist-vial', weight: 50 },
        { itemId: 'golem-clay', weight: 25 },
      ],
      legendary: [
        { itemId: 'alchemist-vial', weight: 30 },
        { itemId: 'golem-clay', weight: 50 },
        { itemId: 'crown-shard', weight: 20 },
      ],
    } satisfies Record<PlaceRarity, readonly { itemId: string; weight: number }[]>,
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;

/** Relic catalogue. Display names live in i18n, keyed by id. */
export const ITEM_IDS = ['tram-ticket', 'trdelnik', 'old-map', 'alchemist-vial', 'golem-clay', 'crown-shard'] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export const ITEM_RARITY: Record<ItemId, PlaceRarity> = {
  'tram-ticket': 'common',
  trdelnik: 'common',
  'old-map': 'rare',
  'alchemist-vial': 'rare',
  'golem-clay': 'epic',
  'crown-shard': 'legendary',
};

/**
 * Daily quest templates. Each day three different kinds are drawn with the
 * player's seed; `targets[tier]` is the goal for that difficulty.
 */
export const DAILY_QUEST_POOL = [
  { kind: 'steps', targets: [3_000, 6_000, 10_000] },
  { kind: 'hexes', targets: [3, 6, 12] },
  { kind: 'checkIns', targets: [1, 2, 4] },
  { kind: 'checkInType', placeType: 'cafe', targets: [1, 1, 2] },
  { kind: 'checkInType', placeType: 'pub', targets: [1, 1, 2] },
  { kind: 'checkInType', placeType: 'metro', targets: [1, 2, 3] },
  { kind: 'checkInType', placeType: 'park', targets: [1, 1, 2] },
  { kind: 'checkInType', placeType: 'church', targets: [1, 1, 2] },
  { kind: 'checkInType', placeType: 'viewpoint', targets: [1, 1, 1] },
] as const;

/**
 * Story side quests: ordered walks between places, matched by Czech name so
 * they survive regenerating the place catalogue. Story text lives in i18n.
 */
export const STORY_QUESTS = [
  { id: 'golem', steps: ['Staronová synagoga', 'Karlův most', 'Pražský hrad'], xp: 1_200, coins: 150, itemId: 'golem-clay' },
  { id: 'alchemist', steps: ['Klementinum', 'Staroměstská mostecká věž', 'Zlatá ulička'], xp: 1_000, coins: 120, itemId: 'alchemist-vial' },
  { id: 'libuse', steps: ['Vyšehrad', 'Rotunda svatého Martina', 'Pražský hrad'], xp: 1_200, coins: 150, itemId: 'crown-shard' },
  { id: 'hanus', steps: ['Staroměstský orloj', 'Týnský chrám', 'Staroměstské náměstí'], xp: 800, coins: 100, itemId: null },
  { id: 'first-republic', steps: ['Kavárna Slavia', 'Café Louvre', 'Grand Café Orient', 'Café Imperial'], xp: 900, coins: 140, itemId: null },
  { id: 'beer-trail', steps: ['U Zlatého tygra', 'U Medvídků', 'U Fleků'], xp: 900, coins: 140, itemId: null },
  { id: 'green-line', steps: ['Hradčanská', 'Malostranská', 'Staroměstská', 'Můstek', 'Muzeum'], xp: 700, coins: 90, itemId: 'tram-ticket' },
  { id: 'bridges', steps: ['Most Legií', 'Karlův most', 'Mánesův most'], xp: 700, coins: 90, itemId: 'old-map' },
] as const;

/** Fictional Prague characters the player races on the weekly leaderboard. */
export const RIVALS = [
  { id: 'hanus', weeklyXp: 9_000 },
  { id: 'golem', weeklyXp: 6_500 },
  { id: 'libuse', weeklyXp: 4_800 },
  { id: 'bruncvik', weeklyXp: 3_200 },
  { id: 'svejk', weeklyXp: 1_600 },
  { id: 'turista', weeklyXp: 700 },
] as const;

/** Rank titles by minimum level. Names live in i18n. */
export const RANK_TITLES = [
  { id: 'turista', minLevel: 1 },
  { id: 'vyletnik', minLevel: 3 },
  { id: 'naplava', minLevel: 6 },
  { id: 'prazak-na-zkousku', minLevel: 10 },
  { id: 'prazak', minLevel: 15 },
  { id: 'stamgast', minLevel: 22 },
  { id: 'znalec', minLevel: 30 },
  { id: 'patriot', minLevel: 45 },
  { id: 'strazce-orloje', minLevel: 65 },
  { id: 'karel-iv', minLevel: 90 },
] as const;
