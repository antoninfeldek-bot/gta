import { GAME_CONFIG } from './config';
import { gameDay, gameWeek } from './time';
import type { GameState } from './types';

export function emptyDaily(day: string): GameState['daily'] {
  return { day, steps: 0, xpSteps: 0, hexes: 0, checkIns: 0, checkInTypes: {}, questsDone: [] };
}

export function createInitialState(now: number, playerSeed: string): GameState {
  return {
    schemaVersion: GAME_CONFIG.schemaVersion,
    playerSeed,
    xp: 0,
    level: 1,
    coins: 0,
    revealedHexes: {},
    lastFix: null,
    daily: emptyDaily(gameDay(now)),
    streak: { count: 0, lastDay: null },
    weekly: { week: gameWeek(now), xp: 0 },
    story: {},
    dishes: {},
    totalSteps: 0,
    gpsStepRemainderM: 0,
    places: {},
    completedSets: {},
    inventory: {},
    stats: { acceptedFixes: 0, rejectedFixes: {}, walkedMeters: 0 },
  };
}
