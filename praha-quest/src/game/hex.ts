import { cellToLatLng, gridDistance, gridPathCells, latLngToCell } from 'h3-js';
import { GAME_CONFIG } from './config';

const { resolution, maxPathFillDistance } = GAME_CONFIG.hex;

export function cellFor(lat: number, lng: number): string {
  return latLngToCell(lat, lng, resolution);
}

export function cellCenter(cell: string): { lat: number; lng: number } {
  const [lat, lng] = cellToLatLng(cell);
  return { lat, lng };
}

/**
 * Cells to reveal when moving from `from` to `to`: the path between them when
 * they are close, otherwise just the destination.
 */
export function cellsAlongMove(from: string | null, to: string): string[] {
  if (!from || from === to) return [to];
  try {
    if (gridDistance(from, to) <= maxPathFillDistance) return gridPathCells(from, to);
  } catch {
    // Pentagon distortion or a cell far away: fall through.
  }
  return [to];
}
