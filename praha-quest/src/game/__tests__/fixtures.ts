import { createEngine } from '../engine';
import { createInitialState } from '../state';
import type { GeoFix, PlaceCatalog } from '../types';

/** Two real Old Town points ~120 m apart, used only as test coordinates. */
export const OLD_TOWN_SQUARE = { lat: 50.08755, lng: 14.42115 };
export const NEAR_SQUARE = { lat: 50.0868, lng: 14.4224 };

export const catalog: PlaceCatalog = {
  places: [
    { id: 'square', nameCs: 'Staroměstské náměstí', type: 'landmark', lat: OLD_TOWN_SQUARE.lat, lng: OLD_TOWN_SQUARE.lng, district: 'Praha 1', rarity: 'legendary' },
    { id: 'near', nameCs: 'Blízké místo', type: 'landmark', lat: NEAR_SQUARE.lat, lng: NEAR_SQUARE.lng, district: 'Praha 1', rarity: 'common' },
    { id: 'far', nameCs: 'Daleké místo', type: 'metro', lat: 50.03, lng: 14.5, district: 'Praha 11', rarity: 'common' },
  ],
  sets: [{ id: 'pair', nameCs: 'Dvojice', placeIds: ['square', 'near'] }],
};

export const T0 = Date.UTC(2026, 10, 16, 10, 0, 0);
export const engine = createEngine(catalog);
export const fresh = () => createInitialState(T0, 'test-seed');

export const fix = (pos: { lat: number; lng: number }, timestamp: number, extra: Partial<GeoFix> = {}): GeoFix => ({
  ...pos,
  accuracy: 10,
  speed: null,
  timestamp,
  ...extra,
});
