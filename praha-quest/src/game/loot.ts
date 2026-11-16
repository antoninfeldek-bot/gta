import { GAME_CONFIG } from './config';
import { createRng, randomInt, weightedPick } from './rng';
import type { Place } from './types';

export interface LootRoll {
  coins: number;
  itemId: string | null;
}

/**
 * Deterministic loot for one claim. The same player, place, day and visit
 * number always roll the same result, so a server can verify the claim.
 */
export function rollLoot(playerSeed: string, place: Pick<Place, 'id' | 'rarity'>, day: string, visit: number): LootRoll {
  const rng = createRng(`${playerSeed}|${place.id}|${day}|${visit}`);
  const [min, max] = GAME_CONFIG.loot.coins[place.rarity];
  const coins = randomInt(rng, min, max);
  const itemId =
    rng() < GAME_CONFIG.loot.relicChance[place.rarity] ? weightedPick(rng, GAME_CONFIG.loot.relicTable[place.rarity]).itemId : null;
  return { coins, itemId };
}
