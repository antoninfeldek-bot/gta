/**
 * Fog-of-war geometry for the visible part of the map only.
 *
 * The whole fog is ONE polygon (the padded viewport) whose holes are the
 * outlines of the explored territory, so the native map draws a single shape
 * no matter how much the player has walked.
 */
import { cellToBoundary, cellToLatLng, cellsToMultiPolygon, polygonToCells } from 'h3-js';
import { GAME_CONFIG } from '@/game/config';

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
export interface LatLng {
  latitude: number;
  longitude: number;
}

export const FOG_LIMITS = {
  /** The viewport is padded so panning does not reveal the fog edge. */
  padding: 0.6,
  /** Above this zoom-out (degrees of latitude) the hex grid lines are hidden. */
  gridMaxLatDelta: 0.025,
  /** Never draw more grid cells than this. */
  maxGridCells: 260,
  /** Never cut more explored cells than this into the fog. */
  maxHoleCells: 4_000,
} as const;

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function regionBounds(region: Region, padding = 0): Bounds {
  const lat = (region.latitudeDelta / 2) * (1 + padding);
  const lng = (region.longitudeDelta / 2) * (1 + padding);
  return {
    north: region.latitude + lat,
    south: region.latitude - lat,
    east: region.longitude + lng,
    west: region.longitude - lng,
  };
}

export const inBounds = (b: Bounds, lat: number, lng: number) =>
  lat <= b.north && lat >= b.south && lng <= b.east && lng >= b.west;

/** Round a region so tiny pans reuse the memoised geometry. */
export function quantizeRegion(region: Region): Region {
  const step = region.latitudeDelta / 6;
  const q = (v: number) => Math.round(v / step) * step;
  const zoomStep = (v: number) => Math.pow(2, Math.round(Math.log2(v) * 2) / 2);
  return {
    latitude: q(region.latitude),
    longitude: q(region.longitude),
    latitudeDelta: zoomStep(region.latitudeDelta),
    longitudeDelta: zoomStep(region.longitudeDelta),
  };
}

export interface FogGeometry {
  fog: LatLng[];
  holes: LatLng[][];
  /** Unexplored pockets fully enclosed by explored land. */
  islands: LatLng[][];
  /** Outer edges of the explored territory (drawn with a glow). */
  shores: LatLng[][];
  /** Outlines of unexplored cells near the centre, for the hex texture. */
  grid: LatLng[][];
}

const toLatLng = ([lng, lat]: number[]): LatLng => ({ latitude: lat, longitude: lng });

export function computeFog(region: Region, revealed: Record<string, number>): FogGeometry {
  const padded = regionBounds(region, FOG_LIMITS.padding);
  const fog: LatLng[] = [
    { latitude: padded.north, longitude: padded.west },
    { latitude: padded.north, longitude: padded.east },
    { latitude: padded.south, longitude: padded.east },
    { latitude: padded.south, longitude: padded.west },
  ];

  // Explored cells whose centre lies inside the padded viewport.
  const visible: string[] = [];
  for (const cell in revealed) {
    const [lat, lng] = cellToLatLng(cell);
    if (inBounds(padded, lat, lng)) visible.push(cell);
    if (visible.length >= FOG_LIMITS.maxHoleCells) break;
  }

  const holes: LatLng[][] = [];
  const islands: LatLng[][] = [];
  if (visible.length > 0) {
    // GeoJSON order: [polygon][loop][point][lng, lat]; loop 0 is the outer edge.
    for (const polygon of cellsToMultiPolygon(visible, true)) {
      const [outer, ...inner] = polygon;
      holes.push(outer.slice(0, -1).map(toLatLng));
      for (const loop of inner) islands.push(loop.slice(0, -1).map(toLatLng));
    }
  }

  const grid: LatLng[][] = [];
  if (region.latitudeDelta <= FOG_LIMITS.gridMaxLatDelta) {
    const b = regionBounds(region, 0.2);
    const cells = polygonToCells(
      [
        [b.north, b.west],
        [b.north, b.east],
        [b.south, b.east],
        [b.south, b.west],
      ],
      GAME_CONFIG.hex.resolution,
    );
    for (const cell of cells) {
      if (revealed[cell] != null) continue;
      grid.push(cellToBoundary(cell).map(([lat, lng]) => ({ latitude: lat, longitude: lng })));
      if (grid.length >= FOG_LIMITS.maxGridCells) break;
    }
  }

  return { fog, holes, islands, shores: holes, grid };
}
