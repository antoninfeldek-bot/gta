import { GAME_CONFIG } from './config';

const dayFormatter = (() => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: GAME_CONFIG.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return null;
  }
})();

/** Game day ("YYYY-MM-DD") for an epoch-ms timestamp, in the game time zone. */
export function gameDay(now: number): string {
  const date = new Date(now);
  if (dayFormatter) {
    const parts = dayFormatter.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  return date.toISOString().slice(0, 10);
}

/** Game week id: the game day (YYYY-MM-DD) of that week's Monday. */
export function gameWeek(now: number): string {
  const day = gameDay(now);
  const date = new Date(`${day}T12:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

/** Fraction (0..1) of the game week that has passed at `now`. */
export function weekProgress(now: number): number {
  const monday = Date.parse(`${gameWeek(now)}T00:00:00Z`);
  // Approximate local midnight with UTC; a ±2 h skew is irrelevant for pacing.
  return Math.min(1, Math.max(0, (now - monday) / (7 * 24 * 3600_000)));
}
