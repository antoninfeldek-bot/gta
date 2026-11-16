/**
 * Builds assets/places.json from OpenStreetMap (Overpass API) for the whole
 * of Prague. Run with:  npx tsx scripts/fetch-places.ts
 *
 * Every coordinate comes from OSM; nothing is invented. Rarity and sets are
 * derived from OSM tags plus a short curated list of Prague's top landmarks.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Place, PlaceCatalog, PlaceRarity, PlaceSet, PlaceType } from '../src/game/types';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
/** OSM relation of the City of Prague; Overpass area ids are 3600000000 + relation id. */
const PRAGUE_RELATION_ID = 435514;
const PRAGUE_AREA = 3_600_000_000 + PRAGUE_RELATION_ID;
const DEDUPE_RADIUS_M = 50;
const MIN_PARK_AREA_M2 = 20_000; // 2 ha
const OUT_FILE = resolve(__dirname, '../assets/places.json');

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
  members?: { type: string; role: string; geometry?: { lat: number; lon: number }[] }[];
}

const MAIN_QUERY = `
[out:json][timeout:180];
area(${PRAGUE_AREA})->.praha;
(
  nwr["tourism"="attraction"]["wikidata"](area.praha);
  nwr["historic"]["wikidata"](area.praha);
  nwr["tourism"="viewpoint"](area.praha);
  nwr["tourism"="museum"]["wikidata"](area.praha);
  nwr["amenity"="place_of_worship"]["wikidata"](area.praha);
  nwr["building"~"^(church|cathedral|chapel)$"]["wikidata"](area.praha);
  nwr["man_made"="tower"]["wikidata"](area.praha);
  nwr["man_made"="bridge"]["wikidata"](area.praha);
  way["bridge"]["wikidata"]["name"](area.praha);
  nwr["station"="subway"](area.praha);
  nwr["railway"="station"]["subway"="yes"](area.praha);
);
out center tags;
`;

const PARK_QUERY = `
[out:json][timeout:180];
area(${PRAGUE_AREA})->.praha;
(
  way["leisure"="park"]["name"](area.praha);
  relation["leisure"="park"]["name"](area.praha);
);
out geom tags;
`;

const DISTRICT_QUERY = `
[out:json][timeout:180];
area(${PRAGUE_AREA})->.praha;
relation["boundary"="administrative"]["admin_level"="10"](area.praha);
out geom tags;
`;

async function overpass(query: string): Promise<OsmElement[]> {
  let lastError: unknown;
  for (const endpoint of ENDPOINTS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'praha-quest-data-script/1.0' },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (!res.ok) throw new Error(`${endpoint} → HTTP ${res.status}`);
        const json = (await res.json()) as { elements: OsmElement[] };
        return json.elements;
      } catch (error) {
        lastError = error;
        console.warn(`  ${endpoint} attempt ${attempt} failed: ${(error as Error).message}`);
        await new Promise((r) => setTimeout(r, 4_000 * attempt));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------- geometry

type Ring = { lat: number; lon: number }[];

const toRad = (d: number) => (d * Math.PI) / 180;
function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.sqrt(h));
}

/** Planar polygon area in m² (equirectangular projection, accurate enough at city scale). */
function ringAreaM2(ring: Ring): number {
  if (ring.length < 3) return 0;
  const lat0 = toRad(ring[0].lat);
  const k = 111_320;
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    sum += a.lon * Math.cos(lat0) * k * (b.lat * k) - b.lon * Math.cos(lat0) * k * (a.lat * k);
  }
  return Math.abs(sum / 2);
}

/** Segments of an element's outer boundary (ways of a relation need not be ordered). */
function outerSegments(el: OsmElement): Ring[] {
  if (el.geometry) return [el.geometry];
  return (el.members ?? []).filter((m) => m.role !== 'inner' && m.geometry).map((m) => m.geometry!);
}

/** Even-odd ray casting over unordered segments — works for multi-way relations. */
function pointInSegments(lat: number, lon: number, lines: Ring[]): boolean {
  let inside = false;
  for (const line of lines) {
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i];
      const b = line[i + 1];
      if (a.lat > lat !== b.lat > lat && lon < ((b.lon - a.lon) * (lat - a.lat)) / (b.lat - a.lat) + a.lon) inside = !inside;
    }
  }
  return inside;
}

function centroid(lines: Ring[]): { lat: number; lon: number } {
  let lat = 0;
  let lon = 0;
  let n = 0;
  for (const line of lines) for (const p of line) (lat += p.lat), (lon += p.lon), n++;
  return { lat: lat / n, lon: lon / n };
}

// ---------------------------------------------------------------- classification

/** Curated top tier: matched against the OSM Czech name (case-insensitive, prefix). */
const LEGENDARY_NAMES = [
  'Pražský hrad',
  'Karlův most',
  'Staroměstské náměstí',
  'Staroměstský orloj',
  'Katedrála svatého Víta',
  'Katedrála sv. Víta',
  'Vyšehrad',
  'Petřínská rozhledna',
  'Žižkovský vysílač',
  'Václavské náměstí',
  'Národní divadlo',
  'Národní muzeum',
  'Tančící dům',
  'Obecní dům',
];
const EPIC_NAMES = [
  'Loreta',
  'Strahovský klášter',
  'Zlatá ulička',
  'Prašná brána',
  'Staroměstská mostecká věž',
  'Malostranská mostecká věž',
  'Týnský chrám',
  'Kostel Matky Boží před Týnem',
  'Chrám svatého Mikuláše',
  'Kostel svatého Mikuláše',
  'Bazilika svatého Jiří',
  'Rudolfinum',
  'Valdštejnský palác',
  'Josefov',
  'Staronová synagoga',
  'Starý židovský hřbitov',
  'Letenský zámeček',
  'Metronom',
  'Rotunda svatého Martina',
  'Bazilika svatého Petra a Pavla',
  'Kampa',
  'Lennonova zeď',
  'Pražská zoologická zahrada',
  'Trojský zámek',
  'Obora Hvězda',
  'Klementinum',
];
const METRO_TRANSFER = ['Můstek', 'Muzeum', 'Florenc'];

const norm = (s: string) =>
  s
    .toLocaleLowerCase('cs')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const matchesAny = (name: string, list: string[]) => list.some((n) => norm(name).startsWith(norm(n)));

function classify(tags: Record<string, string>): PlaceType | null {
  if (tags.station === 'subway' || (tags.railway === 'station' && tags.subway === 'yes')) return 'metro';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  if (tags.tourism === 'museum') return 'museum';
  if (tags.man_made === 'bridge' || tags.bridge) return 'bridge';
  if (tags.man_made === 'tower' || tags.historic === 'tower' || tags['tower:type'] === 'observation') return 'tower';
  if (tags.amenity === 'place_of_worship' || ['church', 'cathedral', 'chapel'].includes(tags.building ?? '')) return 'church';
  if (tags.tourism === 'attraction' || tags.historic) return 'landmark';
  return null;
}

function rarityFor(name: string, type: PlaceType, tags: Record<string, string>): PlaceRarity {
  if (matchesAny(name, LEGENDARY_NAMES)) return 'legendary';
  if (matchesAny(name, EPIC_NAMES)) return 'epic';
  if (type === 'metro') return METRO_TRANSFER.some((n) => norm(name) === norm(n)) ? 'rare' : 'common';
  const notability = (tags.wikipedia ? 1 : 0) + (tags.heritage ? 1 : 0) + (tags.wikidata ? 1 : 0);
  if (['tower', 'museum', 'viewpoint', 'bridge'].includes(type)) return notability >= 2 ? 'rare' : 'common';
  if (type === 'church') return tags.heritage && tags.wikipedia ? 'rare' : 'common';
  return notability >= 3 ? 'rare' : 'common';
}

// Skip noise: memorial plaques, wayside crosses, boundary stones, etc.
const SKIP_HISTORIC = new Set(['memorial', 'wayside_cross', 'wayside_shrine', 'boundary_stone', 'milestone', 'stone', 'tomb', 'grave', 'yes']);

const RARITY_RANK: Record<PlaceRarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

async function main() {
  console.log('Fetching Prague districts…');
  const districts = (await overpass(DISTRICT_QUERY))
    .filter((d) => d.tags?.name)
    .map((d) => ({ name: d.tags!.name, lines: outerSegments(d) }));
  console.log(`  ${districts.length} districts`);
  const districtFor = (lat: number, lon: number) =>
    districts.find((d) => pointInSegments(lat, lon, d.lines))?.name ?? 'Praha';

  console.log('Fetching landmarks, viewpoints, museums, churches, towers, bridges, metro…');
  const main = await overpass(MAIN_QUERY);
  console.log(`  ${main.length} raw elements`);
  console.log('Fetching parks…');
  const parks = await overpass(PARK_QUERY);
  console.log(`  ${parks.length} raw parks`);

  const raw: (Place & { score: number })[] = [];
  for (const el of main) {
    const tags = el.tags ?? {};
    const name = tags['name:cs'] ?? tags.name;
    if (!name) continue;
    const type = classify(tags);
    if (!type) continue;
    if (type === 'landmark' && tags.historic && SKIP_HISTORIC.has(tags.historic) && tags.tourism !== 'attraction') continue;
    if (type !== 'metro' && type !== 'viewpoint' && !tags.wikidata) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const rarity = rarityFor(name, type, tags);
    raw.push({
      id: `osm-${el.type[0]}${el.id}`,
      nameCs: name.replace(/^Metro\s+/i, ''),
      type,
      lat,
      lng,
      district: districtFor(lat, lng),
      ...(tags.wikidata ? { wikidata: tags.wikidata } : {}),
      rarity,
      score: RARITY_RANK[rarity] * 10 + (tags.wikidata ? 2 : 0) + (el.type === 'node' ? 1 : 0),
    });
  }
  for (const el of parks) {
    const tags = el.tags ?? {};
    const name = tags['name:cs'] ?? tags.name;
    const lines = outerSegments(el);
    if (!name || lines.length === 0) continue;
    const area = el.type === 'way' ? ringAreaM2(lines[0]) : lines.reduce((s, l) => s + ringAreaM2(l), 0);
    if (area < MIN_PARK_AREA_M2) continue;
    const c = centroid(lines);
    const base = rarityFor(name, 'park', tags);
    const rarity: PlaceRarity = base === 'common' && area > 300_000 ? 'rare' : base;
    raw.push({
      id: `osm-${el.type[0]}${el.id}`,
      nameCs: name,
      type: 'park',
      lat: c.lat,
      lng: c.lon,
      district: districtFor(c.lat, c.lon),
      ...(tags.wikidata ? { wikidata: tags.wikidata } : {}),
      rarity,
      score: RARITY_RANK[rarity] * 10 + (tags.wikidata ? 2 : 0),
    });
  }

  // Deduplicate: same normalised name within 50 m (metro: same name anywhere — one
  // station has several OSM nodes, one per line and platform).
  raw.sort((a, b) => b.score - a.score);
  const kept: (Place & { score: number })[] = [];
  for (const p of raw) {
    const dup = kept.find(
      (k) =>
        k.id === p.id ||
        (norm(k.nameCs) === norm(p.nameCs) &&
          ((k.type === 'metro' && p.type === 'metro') || distanceM(k, p) <= DEDUPE_RADIUS_M)),
    );
    if (dup) {
      if (!dup.wikidata && p.wikidata) dup.wikidata = p.wikidata;
      continue;
    }
    kept.push(p);
  }
  // Unnamed-ish viewpoints without wikidata are only kept if they have a real name.
  const places: Place[] = kept
    .filter((p) => !(p.type === 'viewpoint' && !p.wikidata && /^vyhlídka$/i.test(p.nameCs.trim())))
    .map(({ score: _score, ...p }) => p)
    .sort((a, b) => a.nameCs.localeCompare(b.nameCs, 'cs'));

  const byType = (type: PlaceType) => places.filter((p) => p.type === type).map((p) => p.id);
  const sets: PlaceSet[] = [
    { id: 'metro-all', nameCs: 'Všechny stanice metra', placeIds: byType('metro') },
    { id: 'bridges', nameCs: 'Mosty', placeIds: byType('bridge') },
    { id: 'viewpoints', nameCs: 'Vyhlídky', placeIds: byType('viewpoint') },
    { id: 'towers', nameCs: 'Pražské věže', placeIds: byType('tower') },
    { id: 'museums', nameCs: 'Muzea', placeIds: byType('museum') },
    { id: 'parks', nameCs: 'Parky a zahrady', placeIds: byType('park') },
    { id: 'legends', nameCs: 'Legendy Prahy', placeIds: places.filter((p) => p.rarity === 'legendary').map((p) => p.id) },
    {
      id: 'old-town-royal-route',
      nameCs: 'Královská cesta',
      placeIds: places
        .filter((p) => matchesAny(p.nameCs, ['Prašná brána', 'Staroměstské náměstí', 'Karlův most', 'Pražský hrad', 'Staroměstská mostecká věž']))
        .map((p) => p.id),
    },
  ].filter((s) => s.placeIds.length > 0);

  const catalog: PlaceCatalog & { generatedAt: string; source: string } = {
    generatedAt: new Date().toISOString(),
    source: '© OpenStreetMap contributors, ODbL 1.0',
    places,
    sets,
  };
  writeFileSync(OUT_FILE, JSON.stringify(catalog, null, 1) + '\n');
  const count = (r: PlaceRarity) => places.filter((p) => p.rarity === r).length;
  console.log(
    `Wrote ${places.length} places (${count('legendary')} legendary, ${count('epic')} epic, ${count('rare')} rare, ${count('common')} common) and ${sets.length} sets → ${OUT_FILE}`,
  );
  for (const s of sets) console.log(`  ${s.nameCs}: ${s.placeIds.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
