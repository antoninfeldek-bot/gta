import { useMemo } from 'react';
import { distanceM, GAME_CONFIG, type Place } from '@/game';
import { engine } from '@/store/game-store';

export interface NearbyPlace {
  place: Place;
  distance: number;
}

/** Places sorted by distance from `position`, within the nearby radius. */
export function useNearbyPlaces(position: { lat: number; lng: number } | null, limit = 5): NearbyPlace[] {
  // Round to ~10 m so the list does not re-sort on every GPS wobble.
  const lat = position ? Math.round(position.lat * 10_000) / 10_000 : null;
  const lng = position ? Math.round(position.lng * 10_000) / 10_000 : null;
  return useMemo(() => {
    if (lat == null || lng == null) return [];
    return engine.catalog.places
      .map((place) => ({ place, distance: distanceM({ lat, lng }, place) }))
      .filter((p) => p.distance <= GAME_CONFIG.places.nearbyRadiusM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }, [lat, lng, limit]);
}
