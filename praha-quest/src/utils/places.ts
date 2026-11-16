import type { Place, PlaceRarity } from '@/game';
import { inBounds, regionBounds, type Region } from './fog';

const RANK: Record<PlaceRarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
export const MAX_MARKERS = 120;

/** Which rarities are drawn at a given zoom, so a zoomed-out map stays readable. */
export function minRarityFor(latDelta: number): PlaceRarity {
  if (latDelta > 0.12) return 'legendary';
  if (latDelta > 0.06) return 'epic';
  if (latDelta > 0.03) return 'rare';
  return 'common';
}

/** Places to draw for a viewport: inside it (with margin), rare enough for the zoom, capped. */
export function visiblePlaces(places: Place[], region: Region): Place[] {
  const b = regionBounds(region, 0.2);
  const min = RANK[minRarityFor(region.latitudeDelta)];
  return places
    .filter((p) => RANK[p.rarity] >= min && inBounds(b, p.lat, p.lng))
    .sort((a, b2) => RANK[b2.rarity] - RANK[a.rarity])
    .slice(0, MAX_MARKERS);
}

export const PLACE_GLYPH: Record<Place['type'], string> = {
  landmark: '♜',
  viewpoint: '◉',
  park: '❦',
  museum: '▣',
  church: '✝',
  metro: 'M',
  bridge: '⌒',
  tower: '▲',
};

/** Where the map opens before the player has a position (Staroměstské náměstí). */
export const PRAGUE_REGION: Region = { latitude: 50.0875, longitude: 14.4213, latitudeDelta: 0.012, longitudeDelta: 0.012 };
