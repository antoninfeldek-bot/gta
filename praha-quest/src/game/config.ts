/**
 * Every tunable game number lives here. Nothing in src/game/ may hard-code a
 * reward, radius, rate or cooldown — import it from this file instead, so the
 * same values can later be served by the backend.
 */
import type { PlaceRarity } from './types';

export const GAME_CONFIG = {
  /** Persisted state schema version. Bump together with a migration in migrations.ts. */
  schemaVersion: 2,

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
