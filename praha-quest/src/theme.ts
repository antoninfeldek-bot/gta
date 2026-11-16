/**
 * Design tokens. Direction: Prague after dark — river-slate night, the gilt of
 * spires and the patina green of copper domes. Gold marks progress and
 * rewards; patina marks territory you own.
 */
import type { PlaceRarity } from '@/game/types';

export const color = {
  night: '#0F1C26', // Vltava at night — base background
  slate: '#182A37', // raised surfaces
  slateHigh: '#22384A', // pressed / borders
  fog: 'rgba(9, 16, 22, 0.78)', // unexplored territory
  gilt: '#E2B14D', // spire gold — XP, rewards, primary actions
  giltDeep: '#9C7428',
  patina: '#6FB7A0', // copper dome green — explored land, success
  parchment: '#EFE6D2', // primary text
  parchmentDim: '#A9B4B8', // secondary text
  ink: '#0A141B', // text on gilt
  danger: '#E07A5F',
} as const;

export const rarityColor: Record<PlaceRarity, string> = {
  common: '#A9B4B8',
  rare: '#6FA8DC',
  epic: '#B98AE6',
  legendary: color.gilt,
};

export const font = {
  display: 'Fraunces_600SemiBold',
  displayBlack: 'Fraunces_800ExtraBold',
  displayItalic: 'Fraunces_400Regular_Italic',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodyBold: 'Figtree_700Bold',
} as const;

/** Type scale (pt). */
export const size = { caption: 12, small: 14, body: 16, title: 21, headline: 28, hero: 44 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 } as const;

/** Radii scale with hierarchy: chips are round, panels are softly cut, the sheet is generous. */
export const radius = { chip: 999, control: 12, panel: 18, sheet: 26 } as const;
