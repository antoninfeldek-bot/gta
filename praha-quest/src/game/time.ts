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
