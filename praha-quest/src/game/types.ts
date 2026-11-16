/** Shared game types. No React, no platform APIs. */

export type PlaceRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type PlaceType = 'landmark' | 'viewpoint' | 'park' | 'museum' | 'church' | 'metro' | 'bridge' | 'tower';

export interface Place {
  id: string;
  nameCs: string;
  type: PlaceType;
  lat: number;
  lng: number;
  district: string;
  wikidata?: string;
  rarity: PlaceRarity;
}

export interface PlaceSet {
  id: string;
  nameCs: string;
  placeIds: string[];
}

export interface PlaceCatalog {
  places: Place[];
  sets: PlaceSet[];
}

export interface GeoFix {
  lat: number;
  lng: number;
  /** Horizontal accuracy in metres (null when the platform does not report it). */
  accuracy: number | null;
  /** Device-reported speed in m/s, if any. */
  speed?: number | null;
  /** Epoch ms when the fix was taken. */
  timestamp: number;
}

export type GameEvent =
  | {
      type: 'location';
      fix: GeoFix;
      /** True when there is no pedometer, so walked GPS distance converts to steps. */
      creditGpsSteps: boolean;
    }
  | { type: 'steps'; delta: number }
  | { type: 'checkIn'; placeId: string };

export type RejectReason = 'accuracy' | 'speed' | 'teleport' | 'stale' | 'order';

export type Reward =
  | { kind: 'xp'; amount: number; source: 'hex' | 'steps' | 'place' | 'set' }
  | { kind: 'coins'; amount: number; source: 'place' | 'set' | 'level' }
  | { kind: 'item'; itemId: string; count: number }
  | { kind: 'hexRevealed'; cell: string }
  | { kind: 'levelUp'; level: number }
  | { kind: 'placeDiscovered'; placeId: string }
  | { kind: 'placeRevisited'; placeId: string }
  | { kind: 'setCompleted'; setId: string };

export type CheckInFailure = 'unknownPlace' | 'noFix' | 'tooFar' | 'cooldown';

export interface LastFix {
  lat: number;
  lng: number;
  timestamp: number;
  cell: string;
}

export interface PlaceProgress {
  firstVisitedAt: number;
  lastClaimAt: number;
  visits: number;
}

export interface GameState {
  schemaVersion: number;
  /** Random per-install seed for deterministic loot. */
  playerSeed: string;
  /** Lifetime XP. Level is derived from it, but cached for convenience. */
  xp: number;
  level: number;
  coins: number;
  /** H3 cell -> epoch ms first revealed. */
  revealedHexes: Record<string, number>;
  lastFix: LastFix | null;
  daily: {
    /** YYYY-MM-DD in the game time zone. */
    day: string;
    /** Every step seen today. */
    steps: number;
    /** Steps that counted toward XP today (≤ daily cap). */
    xpSteps: number;
  };
  totalSteps: number;
  /** Fractional metres walked on GPS fallback, carried into the next step. */
  gpsStepRemainderM: number;
  places: Record<string, PlaceProgress>;
  completedSets: Record<string, number>;
  inventory: Record<string, number>;
  stats: {
    acceptedFixes: number;
    rejectedFixes: Partial<Record<RejectReason, number>>;
    walkedMeters: number;
  };
}

export interface ApplyResult {
  newState: GameState;
  rewards: Reward[];
  /** Set when a location fix was dropped by the sanity checks. */
  rejected?: RejectReason;
  /** Set when a check-in could not be granted. */
  checkInFailure?: CheckInFailure;
}
