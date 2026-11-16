import { GAME_CONFIG } from './config';
import { distanceM } from './geo';
import type { GeoFix, LastFix, RejectReason } from './types';

const { maxAccuracyM, maxSpeedKmh, teleportDistanceM, teleportWindowMs, maxFixAgeMs, trackResetGapMs } =
  GAME_CONFIG.antiCheat;
const MAX_SPEED_MS = maxSpeedKmh / 3.6;

export type FixVerdict =
  | { ok: true; /** Metres credited as walked since the previous fix. */ walkedM: number }
  | { ok: false; reason: RejectReason };

/** Sanity-checks a GPS fix against the previous accepted one. */
export function checkFix(fix: GeoFix, previous: LastFix | null, now: number): FixVerdict {
  if (fix.accuracy == null || fix.accuracy > maxAccuracyM) return { ok: false, reason: 'accuracy' };
  if (now - fix.timestamp > maxFixAgeMs) return { ok: false, reason: 'stale' };
  if (fix.speed != null && fix.speed > MAX_SPEED_MS) return { ok: false, reason: 'speed' };
  if (!previous) return { ok: true, walkedM: 0 };

  const dt = fix.timestamp - previous.timestamp;
  if (dt <= 0) return { ok: false, reason: 'order' };

  const dist = distanceM(previous, fix);
  if (dt >= trackResetGapMs) return { ok: true, walkedM: 0 };
  if (dt < teleportWindowMs && dist > teleportDistanceM) return { ok: false, reason: 'teleport' };
  // Ignore GPS jitter for the speed check: allow the accuracy radius as slack.
  const slack = fix.accuracy;
  if (Math.max(0, dist - slack) / (dt / 1000) > MAX_SPEED_MS) return { ok: false, reason: 'speed' };
  return { ok: true, walkedM: dist };
}
