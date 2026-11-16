import { GAME_CONFIG } from './config';
import { gameDay } from './time';
import type { GameState } from './types';

export function createInitialState(now: number, playerSeed: string): GameState {
  return {
    schemaVersion: GAME_CONFIG.schemaVersion,
    playerSeed,
    xp: 0,
    level: 1,
    coins: 0,
    revealedHexes: {},
    lastFix: null,
    daily: { day: gameDay(now), steps: 0, xpSteps: 0 },
    totalSteps: 0,
    gpsStepRemainderM: 0,
    places: {},
    completedSets: {},
    inventory: {},
    stats: { acceptedFixes: 0, rejectedFixes: {}, walkedMeters: 0 },
  };
}
