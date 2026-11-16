/**
 * The game engine: pure functions `(state, event, now) => { newState, rewards }`.
 * No React, no I/O. The same module can run on a server to stay authoritative.
 */
import { checkFix } from './anti-cheat';
import { GAME_CONFIG } from './config';
import { distanceM } from './geo';
import { cellFor, cellsAlongMove } from './hex';
import { levelForXp } from './levels';
import { rollLoot } from './loot';
import { gameDay } from './time';
import type { ApplyResult, GameEvent, GameState, GeoFix, Place, PlaceCatalog, PlaceSet, Reward } from './types';

export interface Engine {
  apply(state: GameState, event: GameEvent, now: number): ApplyResult;
  /** Explain why a check-in would fail right now, without changing anything. */
  canCheckIn(state: GameState, placeId: string, now: number): ReturnType<typeof checkInEligibility>;
  catalog: PlaceCatalog;
  placeById: ReadonlyMap<string, Place>;
  setsByPlace: ReadonlyMap<string, PlaceSet[]>;
}

export function createEngine(catalog: PlaceCatalog): Engine {
  const placeById = new Map(catalog.places.map((p) => [p.id, p]));
  const setsByPlace = new Map<string, PlaceSet[]>();
  for (const set of catalog.sets) {
    for (const id of set.placeIds) setsByPlace.set(id, [...(setsByPlace.get(id) ?? []), set]);
  }
  const ctx: EngineContext = { placeById, setsByPlace };

  return {
    catalog,
    placeById,
    setsByPlace,
    canCheckIn: (state, placeId, now) => checkInEligibility(state, placeId, now, ctx),
    apply(state, event, now) {
      const rolled = rollDay(state, now);
      switch (event.type) {
        case 'location':
          return applyLocation(rolled, event.fix, event.creditGpsSteps, now);
        case 'steps':
          return applySteps(rolled, event.delta);
        case 'checkIn':
          return applyCheckIn(rolled, event.placeId, now, ctx);
      }
    },
  };
}

interface EngineContext {
  placeById: ReadonlyMap<string, Place>;
  setsByPlace: ReadonlyMap<string, PlaceSet[]>;
}

/** Start a fresh daily counter when the game day changes. */
function rollDay(state: GameState, now: number): GameState {
  const day = gameDay(now);
  if (state.daily.day === day) return state;
  return { ...state, daily: { day, steps: 0, xpSteps: 0 } };
}

/** Adds XP, handling level-ups and their coin bonus. */
function grantXp(state: GameState, amount: number, source: Extract<Reward, { kind: 'xp' }>['source'], rewards: Reward[]): GameState {
  if (amount <= 0) return state;
  const xp = state.xp + amount;
  const level = levelForXp(xp);
  rewards.push({ kind: 'xp', amount, source });
  let coins = state.coins;
  for (let reached = state.level + 1; reached <= level; reached++) {
    const bonus = GAME_CONFIG.levels.coinsPerLevel * reached;
    coins += bonus;
    rewards.push({ kind: 'levelUp', level: reached });
    rewards.push({ kind: 'coins', amount: bonus, source: 'level' });
  }
  return { ...state, xp, level, coins };
}

function countSteps(state: GameState, delta: number, rewards: Reward[]): GameState {
  const { stepsPerChunk, xpPerChunk, dailyXpCap } = GAME_CONFIG.steps;
  if (delta <= 0) return state;
  const xpSteps = Math.min(dailyXpCap, state.daily.xpSteps + delta);
  const chunks = Math.floor(xpSteps / stepsPerChunk) - Math.floor(state.daily.xpSteps / stepsPerChunk);
  const next: GameState = {
    ...state,
    totalSteps: state.totalSteps + delta,
    daily: { ...state.daily, steps: state.daily.steps + delta, xpSteps },
  };
  return grantXp(next, chunks * xpPerChunk, 'steps', rewards);
}

export function applySteps(state: GameState, delta: number): ApplyResult {
  const rewards: Reward[] = [];
  const safeDelta = Math.min(Math.max(0, Math.floor(delta)), GAME_CONFIG.steps.maxDeltaPerEvent);
  return { newState: countSteps(state, safeDelta, rewards), rewards };
}

export function applyLocation(state: GameState, fix: GeoFix, creditGpsSteps: boolean, now: number): ApplyResult {
  const verdict = checkFix(fix, state.lastFix, now);
  if (!verdict.ok) {
    const rejectedFixes = { ...state.stats.rejectedFixes, [verdict.reason]: (state.stats.rejectedFixes[verdict.reason] ?? 0) + 1 };
    return { newState: { ...state, stats: { ...state.stats, rejectedFixes } }, rewards: [], rejected: verdict.reason };
  }

  const rewards: Reward[] = [];
  const cell = cellFor(fix.lat, fix.lng);
  const fromCell = verdict.walkedM > 0 ? (state.lastFix?.cell ?? null) : null;
  const revealedHexes = { ...state.revealedHexes };
  let newCells = 0;
  for (const c of cellsAlongMove(fromCell, cell)) {
    if (revealedHexes[c] != null) continue;
    revealedHexes[c] = now;
    newCells++;
    rewards.push({ kind: 'hexRevealed', cell: c });
  }

  let next: GameState = {
    ...state,
    revealedHexes,
    lastFix: { lat: fix.lat, lng: fix.lng, timestamp: fix.timestamp, cell },
    stats: {
      ...state.stats,
      acceptedFixes: state.stats.acceptedFixes + 1,
      walkedMeters: state.stats.walkedMeters + verdict.walkedM,
    },
  };
  next = grantXp(next, newCells * GAME_CONFIG.hex.revealXp, 'hex', rewards);

  if (creditGpsSteps && verdict.walkedM > 0) {
    const meters = next.gpsStepRemainderM + verdict.walkedM;
    const steps = Math.floor(meters / GAME_CONFIG.steps.metersPerStep);
    next = { ...next, gpsStepRemainderM: meters - steps * GAME_CONFIG.steps.metersPerStep };
    next = countSteps(next, steps, rewards);
  }
  return { newState: next, rewards };
}

function checkInEligibility(state: GameState, placeId: string, now: number, ctx: EngineContext) {
  const place = ctx.placeById.get(placeId);
  if (!place) return { ok: false as const, reason: 'unknownPlace' as const };
  const fix = state.lastFix;
  if (!fix || now - fix.timestamp > GAME_CONFIG.antiCheat.maxFixAgeMs) return { ok: false as const, reason: 'noFix' as const };
  const distance = distanceM(fix, place);
  if (distance > GAME_CONFIG.places.checkInRadiusM) return { ok: false as const, reason: 'tooFar' as const, distance };
  const progress = state.places[placeId];
  if (progress && now - progress.lastClaimAt < GAME_CONFIG.places.revisitCooldownMs) {
    return { ok: false as const, reason: 'cooldown' as const, readyAt: progress.lastClaimAt + GAME_CONFIG.places.revisitCooldownMs };
  }
  return { ok: true as const, place, distance, firstVisit: !progress };
}

export function applyCheckIn(state: GameState, placeId: string, now: number, ctx: EngineContext): ApplyResult {
  const eligibility = checkInEligibility(state, placeId, now, ctx);
  if (!eligibility.ok) return { newState: state, rewards: [], checkInFailure: eligibility.reason };

  const { place, firstVisit } = eligibility;
  const rewards: Reward[] = [];
  const previous = state.places[placeId];
  let next: GameState = {
    ...state,
    places: {
      ...state.places,
      [placeId]: {
        firstVisitedAt: previous?.firstVisitedAt ?? now,
        lastClaimAt: now,
        visits: (previous?.visits ?? 0) + 1,
      },
    },
  };
  rewards.push(firstVisit ? { kind: 'placeDiscovered', placeId } : { kind: 'placeRevisited', placeId });

  const baseXp = GAME_CONFIG.places.discoverXp[place.rarity];
  next = grantXp(next, firstVisit ? baseXp : Math.round(baseXp * GAME_CONFIG.places.revisitXpFactor), 'place', rewards);

  const loot = rollLoot(next.playerSeed, place, gameDay(now), (previous?.visits ?? 0) + 1);
  next = { ...next, coins: next.coins + loot.coins };
  rewards.push({ kind: 'coins', amount: loot.coins, source: 'place' });
  if (loot.itemId) {
    next = { ...next, inventory: { ...next.inventory, [loot.itemId]: (next.inventory[loot.itemId] ?? 0) + 1 } };
    rewards.push({ kind: 'item', itemId: loot.itemId, count: 1 });
  }

  if (firstVisit) {
    for (const set of ctx.setsByPlace.get(placeId) ?? []) {
      if (next.completedSets[set.id] != null) continue;
      if (!set.placeIds.every((id) => next.places[id])) continue;
      const { baseXp: setXp, perPlaceXp, baseCoins, perPlaceCoins } = GAME_CONFIG.sets;
      const size = set.placeIds.length;
      next = { ...next, completedSets: { ...next.completedSets, [set.id]: now } };
      rewards.push({ kind: 'setCompleted', setId: set.id });
      next = grantXp(next, setXp + perPlaceXp * size, 'set', rewards);
      const coins = baseCoins + perPlaceCoins * size;
      next = { ...next, coins: next.coins + coins };
      rewards.push({ kind: 'coins', amount: coins, source: 'set' });
    }
  }
  return { newState: next, rewards };
}
