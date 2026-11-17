import type { Place } from '@/game';
import { color, rarityColor } from '@/theme';

/** Shared look of place markers (native and web): small enamel plates. */
export function markerLook(place: Place, found: boolean, visible: boolean) {
  const tint = rarityColor[place.rarity];
  const big = place.rarity === 'legendary' || place.rarity === 'epic';
  const sizePx = big ? 34 : 27;
  if (found) return { sizePx, big, bg: tint, border: color.enamel, fg: color.white, tint };
  if (visible) return { sizePx, big, bg: color.enamel, border: tint, fg: color.ink, tint };
  return { sizePx, big, bg: color.night, border: tint, fg: tint, tint };
}
