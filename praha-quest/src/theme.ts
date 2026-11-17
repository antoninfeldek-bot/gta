/**
 * Design tokens. Direction: Prague street furniture.
 * - Enamel street-name plates: cream field, red frame, dark lettering.
 * - House-number plates: blue (orientační číslo) and red (číslo popisné).
 * - Gold and red of the Prague coat of arms.
 * - Metro line colours for transit.
 * The map stays at night so the enamel signs glow on top of it.
 */
import type { PlaceRarity } from '@/game/types';

export const color = {
  // Map / night
  night: '#0F1A24',
  nightHigh: '#1A2A38',
  fog: 'rgba(8, 14, 20, 0.80)',
  // House-facade plaster behind the non-map screens
  plaster: '#E9E2D0',
  plasterDeep: '#DDD4BE',
  // Enamel
  enamel: '#F5F1E6',
  enamelShade: '#E7E0CE',
  enamelEdge: '#D4CBB3',
  // Signage
  signRed: '#C4122F',
  signRedDeep: '#8E0C22',
  plateBlue: '#1E4E95',
  plateBlueDeep: '#143A72',
  ink: '#17191C',
  inkSoft: '#4A4F55',
  inkMute: '#7C7F80',
  // Coat of arms
  gold: '#E2A72E',
  goldDeep: '#A8781A',
  // Territory
  patina: '#5FA38E',
  // Metro
  metroA: '#00A562',
  metroB: '#F7B11E',
  metroC: '#D2153B',
  white: '#FFFFFF',
} as const;

export const rarityColor: Record<PlaceRarity, string> = {
  common: '#7C8A93',
  rare: color.plateBlue,
  epic: '#7B3FA0',
  legendary: color.gold,
};

export const font = {
  /** Street-sign lettering: condensed, bold, always uppercase on signs. */
  sign: 'BarlowCondensed_700Bold',
  signHeavy: 'BarlowCondensed_800ExtraBold',
  signMedium: 'BarlowCondensed_600SemiBold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodyBold: 'Figtree_700Bold',
} as const;

/** Type scale (pt). */
export const size = { caption: 12, small: 14, body: 16, title: 22, headline: 30, hero: 48 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 } as const;

/** Enamel plates have small rounded corners; chips are pills; the sheet is generous. */
export const radius = { plate: 6, control: 10, panel: 14, chip: 999 } as const;

/** Border width of the red frame on street signs. */
export const frame = 3;
