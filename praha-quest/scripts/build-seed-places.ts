/**
 * Builds a starter assets/places.json without the Overpass API.
 *
 *   npx tsx scripts/build-seed-places.ts
 *
 * - Metro: all 61 station stops from the PID timetable data
 *   (scripts/data/pid-metro-stops.geojson, from github.com/krystxf/metro-now, MPL-2.0).
 * - Landmarks: a curated list of Prague's best-known places. These positions
 *   are hand-entered, not fetched, so treat them as provisional: run
 *   `npm run fetch-places` on a network where Overpass works to replace the
 *   whole file with OpenStreetMap data.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Place, PlaceRarity, PlaceSet, PlaceType } from '../src/game/types';

const OUT_FILE = resolve(__dirname, '../assets/places.json');
const METRO_FILE = resolve(__dirname, 'data/pid-metro-stops.geojson');

type Seed = [nameCs: string, type: PlaceType, lat: number, lng: number, district: string, rarity: PlaceRarity, dish?: string];

const LANDMARKS: Seed[] = [
  ['Pražský hrad', 'landmark', 50.0899, 14.3983, 'Praha 1', 'legendary'],
  ['Katedrála svatého Víta', 'church', 50.0909, 14.4005, 'Praha 1', 'legendary'],
  ['Karlův most', 'bridge', 50.0865, 14.4114, 'Praha 1', 'legendary'],
  ['Staroměstské náměstí', 'landmark', 50.0875, 14.4213, 'Praha 1', 'legendary'],
  ['Staroměstský orloj', 'landmark', 50.087, 14.4207, 'Praha 1', 'legendary'],
  ['Vyšehrad', 'landmark', 50.0646, 14.4175, 'Praha 2', 'legendary'],
  ['Petřínská rozhledna', 'tower', 50.0835, 14.3951, 'Praha 1', 'legendary'],
  ['Žižkovský vysílač', 'tower', 50.081, 14.451, 'Praha 3', 'legendary'],
  ['Václavské náměstí', 'landmark', 50.0814, 14.428, 'Praha 1', 'legendary'],
  ['Národní divadlo', 'landmark', 50.081, 14.4134, 'Praha 1', 'legendary'],
  ['Národní muzeum', 'museum', 50.079, 14.4307, 'Praha 1', 'legendary'],
  ['Tančící dům', 'landmark', 50.0755, 14.4141, 'Praha 2', 'legendary'],
  ['Obecní dům', 'landmark', 50.0877, 14.428, 'Praha 1', 'legendary'],

  ['Prašná brána', 'tower', 50.0865, 14.4274, 'Praha 1', 'epic'],
  ['Týnský chrám', 'church', 50.0877, 14.4228, 'Praha 1', 'epic'],
  ['Kostel svatého Mikuláše', 'church', 50.088, 14.4035, 'Praha 1', 'epic'],
  ['Zlatá ulička', 'landmark', 50.0921, 14.404, 'Praha 1', 'epic'],
  ['Loreta', 'church', 50.089, 14.3918, 'Praha 1', 'epic'],
  ['Strahovský klášter', 'landmark', 50.0863, 14.3894, 'Praha 1', 'epic'],
  ['Staroměstská mostecká věž', 'tower', 50.0862, 14.4136, 'Praha 1', 'epic'],
  ['Malostranská mostecká věž', 'tower', 50.087, 14.406, 'Praha 1', 'epic'],
  ['Lennonova zeď', 'landmark', 50.0862, 14.4067, 'Praha 1', 'epic'],
  ['Rudolfinum', 'landmark', 50.09, 14.4153, 'Praha 1', 'epic'],
  ['Staronová synagoga', 'church', 50.0903, 14.4189, 'Praha 1', 'epic'],
  ['Klementinum', 'landmark', 50.0864, 14.4163, 'Praha 1', 'epic'],
  ['Metronom', 'viewpoint', 50.095, 14.4158, 'Praha 7', 'epic'],
  ['Národní památník na Vítkově', 'landmark', 50.0879, 14.4491, 'Praha 3', 'epic'],

  ['Rotunda svatého Martina', 'church', 50.0628, 14.4195, 'Praha 2', 'rare'],
  ['Kostel Panny Marie Vítězné', 'church', 50.086, 14.4038, 'Praha 1', 'rare'],
  ['Jindřišská věž', 'tower', 50.0846, 14.4316, 'Praha 1', 'rare'],
  ['Letohrádek Hvězda', 'landmark', 50.0838, 14.3291, 'Praha 6', 'rare'],
  ['Trojský zámek', 'landmark', 50.1162, 14.4115, 'Praha 7', 'rare'],
  ['Zoologická zahrada Praha', 'park', 50.117, 14.406, 'Praha 7', 'rare'],

  ['Mánesův most', 'bridge', 50.0893, 14.4135, 'Praha 1', 'rare'],
  ['Čechův most', 'bridge', 50.0928, 14.417, 'Praha 1', 'rare'],
  ['Most Legií', 'bridge', 50.0812, 14.4114, 'Praha 1', 'rare'],
  ['Jiráskův most', 'bridge', 50.0748, 14.412, 'Praha 2', 'rare'],
  ['Palackého most', 'bridge', 50.072, 14.4133, 'Praha 2', 'rare'],
  ['Hlávkův most', 'bridge', 50.0975, 14.4327, 'Praha 7', 'common'],
  ['Nuselský most', 'bridge', 50.066, 14.4291, 'Praha 2', 'rare'],

  ['Hanavský pavilon', 'viewpoint', 50.0932, 14.4142, 'Praha 7', 'rare'],
  ['Vyhlídka v Riegrových sadech', 'viewpoint', 50.0782, 14.443, 'Praha 2', 'rare'],
  ['Vyhlídka u Strahovského kláštera', 'viewpoint', 50.0858, 14.3916, 'Praha 1', 'rare'],

  ['Letenské sady', 'park', 50.0957, 14.4225, 'Praha 7', 'rare'],
  ['Stromovka', 'park', 50.1045, 14.418, 'Praha 7', 'rare'],
  ['Riegrovy sady', 'park', 50.079, 14.4415, 'Praha 2', 'common'],
  ['Petřínské sady', 'park', 50.083, 14.399, 'Praha 1', 'common'],
  ['Kampa', 'park', 50.0845, 14.408, 'Praha 1', 'rare'],
  ['Havlíčkovy sady', 'park', 50.069, 14.445, 'Praha 2', 'common'],
  ['Valdštejnská zahrada', 'park', 50.0898, 14.407, 'Praha 1', 'rare'],

  ['Národní technické muzeum', 'museum', 50.0974, 14.4252, 'Praha 7', 'rare'],
  ['Muzeum hlavního města Prahy', 'museum', 50.091, 14.434, 'Praha 8', 'common'],
  ['Veletržní palác', 'museum', 50.1015, 14.4335, 'Praha 7', 'rare'],
  ['Museum Kampa', 'museum', 50.0841, 14.4093, 'Praha 1', 'common'],
  ['Uměleckoprůmyslové museum', 'museum', 50.0895, 14.4166, 'Praha 1', 'common'],

  // Long-standing cafés, pubs and markets. Each unlocks one Czech dish in the cookbook.
  ['Kavárna Slavia', 'cafe', 50.0816, 14.4135, 'Praha 1', 'epic', 'vetrnik'],
  ['Café Louvre', 'cafe', 50.082, 14.4189, 'Praha 1', 'rare', 'rakvicka'],
  ['Grand Café Orient', 'cafe', 50.0868, 14.4246, 'Praha 1', 'rare', 'laskonka'],
  ['Café Imperial', 'cafe', 50.0897, 14.4318, 'Praha 1', 'rare', 'kolac'],
  ['Café Savoy', 'cafe', 50.079, 14.4085, 'Praha 5', 'rare', 'medovnik'],
  ['Kavárna Lucerna', 'cafe', 50.0812, 14.4255, 'Praha 1', 'common', 'spicka'],
  ['U Fleků', 'pub', 50.0786, 14.417, 'Praha 1', 'epic', 'svickova'],
  ['U Zlatého tygra', 'pub', 50.0857, 14.4187, 'Praha 1', 'rare', 'hermelin'],
  ['U Medvídků', 'pub', 50.0827, 14.4189, 'Praha 1', 'rare', 'gulas'],
  ['U Pinkasů', 'pub', 50.0828, 14.4236, 'Praha 1', 'rare', 'vepro-knedlo-zelo'],
  ['Lokál Dlouhááá', 'pub', 50.0903, 14.4255, 'Praha 1', 'common', 'smazak'],
  ['Pivovarský dům', 'pub', 50.0753, 14.422, 'Praha 2', 'common', 'utopenec'],
  ['Letenský zámeček', 'pub', 50.096, 14.4185, 'Praha 7', 'common', 'rizek'],
  ['Náplavka', 'food', 50.0705, 14.414, 'Praha 2', 'common', 'bramborak'],
  ['Havelské tržiště', 'food', 50.0848, 14.4205, 'Praha 1', 'common', 'trdelnik'],
];

/** Transfer stations are worth more. */
const METRO_RARE = new Set(['Můstek', 'Muzeum', 'Florenc']);

const slug = (s: string) =>
  s
    .toLocaleLowerCase('cs')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

interface MetroFeature {
  geometry: { coordinates: [number, number] };
  properties: { name: string; platforms: { name: string }[] };
}

const metro = (JSON.parse(readFileSync(METRO_FILE, 'utf8')) as { features: MetroFeature[] }).features.map((f) => ({
  place: {
    id: `metro-${slug(f.properties.name)}`,
    nameCs: f.properties.name,
    type: 'metro' as const,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    district: 'Praha',
    rarity: (METRO_RARE.has(f.properties.name) ? 'rare' : 'common') as PlaceRarity,
  },
  lines: [...new Set(f.properties.platforms.map((p) => p.name))],
}));

const landmarks: Place[] = LANDMARKS.map(([nameCs, type, lat, lng, district, rarity, dish]) => ({
  id: `seed-${slug(nameCs)}`,
  nameCs,
  type,
  lat,
  lng,
  district,
  rarity,
  ...(dish ? { dish } : {}),
}));

const places = [...metro.map((m) => m.place), ...landmarks].sort((a, b) => a.nameCs.localeCompare(b.nameCs, 'cs'));
const ofType = (type: PlaceType) => places.filter((p) => p.type === type).map((p) => p.id);
const onLine = (line: string) => metro.filter((m) => m.lines.includes(line)).map((m) => m.place.id);
const byName = (names: string[]) => names.map((n) => landmarks.find((p) => p.nameCs === n)!.id);

const sets: PlaceSet[] = [
  { id: 'metro-all', nameCs: 'Všechny stanice metra', placeIds: ofType('metro') },
  { id: 'metro-a', nameCs: 'Linka A', placeIds: onLine('A') },
  { id: 'metro-b', nameCs: 'Linka B', placeIds: onLine('B') },
  { id: 'metro-c', nameCs: 'Linka C', placeIds: onLine('C') },
  { id: 'bridges', nameCs: 'Mosty', placeIds: ofType('bridge') },
  { id: 'viewpoints', nameCs: 'Vyhlídky', placeIds: ofType('viewpoint') },
  { id: 'towers', nameCs: 'Pražské věže', placeIds: ofType('tower') },
  { id: 'museums', nameCs: 'Muzea', placeIds: ofType('museum') },
  { id: 'parks', nameCs: 'Parky a zahrady', placeIds: ofType('park') },
  { id: 'cafes', nameCs: 'Prvorepublikové kavárny', placeIds: ofType('cafe') },
  { id: 'pubs', nameCs: 'Pivní mapa Prahy', placeIds: ofType('pub') },
  { id: 'food-all', nameCs: 'Mlsná Praha', placeIds: places.filter((p) => ['cafe', 'pub', 'food'].includes(p.type)).map((p) => p.id) },
  { id: 'legends', nameCs: 'Legendy Prahy', placeIds: places.filter((p) => p.rarity === 'legendary').map((p) => p.id) },
  {
    id: 'royal-route',
    nameCs: 'Královská cesta',
    placeIds: byName(['Prašná brána', 'Staroměstské náměstí', 'Klementinum', 'Karlův most', 'Kostel svatého Mikuláše', 'Pražský hrad']),
  },
];

writeFileSync(
  OUT_FILE,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: 'seed: metro from PID timetable data (via krystxf/metro-now, MPL-2.0); landmarks hand-entered — replace with `npm run fetch-places`',
      places,
      sets,
    },
    null,
    1,
  ) + '\n',
);
console.log(`Wrote ${places.length} places and ${sets.length} sets → ${OUT_FILE}`);
for (const s of sets) console.log(`  ${s.nameCs}: ${s.placeIds.length}`);
