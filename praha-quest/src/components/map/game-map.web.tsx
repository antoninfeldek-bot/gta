/**
 * Web map (MapLibre GL JS). Same game layers as the native map: one fog
 * polygon for the viewport with explored land cut out, hex grid texture,
 * patina shoreline, hexagonal place markers and the walker.
 */
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { APP_CONFIG } from '@/app-config';
import { cellFor, type Place } from '@/game';
import { engine, useGameStore } from '@/store/game-store';
import { useSensorStore } from '@/store/sensor-store';
import { color, font, rarityColor } from '@/theme';
import { computeFog, quantizeRegion, type LatLng, type Region } from '@/utils/fog';
import { PLACE_GLYPH, PRAGUE_REGION, visiblePlaces } from '@/utils/places';
import type { GameMapHandle, GameMapProps } from './game-map.types';
import { BASEMAP_LAYERS, BASEMAP_SOURCE, GLYPHS } from './web-map-style';

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    basemap: BASEMAP_SOURCE,
    fog: { type: 'geojson', data: emptyFc() },
    grid: { type: 'geojson', data: emptyFc() },
    shores: { type: 'geojson', data: emptyFc() },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': color.night } },
    ...BASEMAP_LAYERS,
    { id: 'grid', type: 'line', source: 'grid', paint: { 'line-color': 'rgba(226,177,77,0.12)', 'line-width': 1 } },
    { id: 'fog', type: 'fill', source: 'fog', paint: { 'fill-color': color.fog, 'fill-antialias': false } },
    { id: 'shores-fill', type: 'fill', source: 'shores', paint: { 'fill-color': 'rgba(111,183,160,0.06)' } },
    { id: 'shores', type: 'line', source: 'shores', paint: { 'line-color': 'rgba(111,183,160,0.85)', 'line-width': 2 } },
  ],
};

export const GameMap = forwardRef<GameMapHandle, GameMapProps>(function GameMap({ onSelectPlace, onPressMap }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const followRef = useRef(true);
  const markersRef = useRef(new Map<string, { marker: maplibregl.Marker; el: HTMLDivElement; state: string }>());
  const walkerRef = useRef<maplibregl.Marker | null>(null);
  const handlers = useRef({ onSelectPlace, onPressMap });
  handlers.current = { onSelectPlace, onPressMap };

  const [region, setRegion] = useState<Region>(PRAGUE_REGION);
  const [ready, setReady] = useState(false);
  const revealed = useGameStore((s) => s.game.revealedHexes);
  const discovered = useGameStore((s) => s.game.places);
  const position = useSensorStore((s) => s.position);
  const permission = useSensorStore((s) => s.permission);
  const simulate = useGameStore((s) => s.settings.simulate && APP_CONFIG.allowSimulatedWalk);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [PRAGUE_REGION.longitude, PRAGUE_REGION.latitude],
      zoom: 15,
      minZoom: 10,
      maxZoom: 18.5,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
    });
    map.touchZoomRotate.disableRotation();
    const updateRegion = () => setRegion(regionOf(map));
    map.on('load', () => {
      setReady(true);
      updateRegion();
    });
    map.on('moveend', updateRegion);
    map.on('dragstart', () => (followRef.current = false));
    map.on('click', (e) => handlers.current.onPressMap({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    mapRef.current = map;
    const markers = markersRef.current;
    return () => {
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    recenter: () => {
      followRef.current = true;
      const p = useSensorStore.getState().position;
      if (p) mapRef.current?.easeTo({ center: [p.lng, p.lat], zoom: Math.max(mapRef.current.getZoom(), 15.5), duration: 450 });
    },
  }));

  // Fog, grid and shoreline for the visible viewport only.
  const key = quantizeRegion(region);
  const fog = useMemo(
    () => computeFog(key, revealed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key.latitude, key.longitude, key.latitudeDelta, key.longitudeDelta, revealed],
  );
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const ring = (pts: LatLng[]) => {
      const coords = pts.map((p) => [p.longitude, p.latitude]);
      return [...coords, coords[0]];
    };
    setData(map, 'fog', [
      polygon([ring(fog.fog), ...fog.holes.map(ring)]),
      ...fog.islands.map((loop) => polygon([ring(loop)])),
    ]);
    setData(map, 'grid', fog.grid.map((cell) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ring(cell) } })));
    setData(map, 'shores', fog.shores.map((loop) => polygon([ring(loop)])));
  }, [fog, ready]);

  // Place markers: diff the visible set instead of rebuilding it.
  const places = useMemo(() => visiblePlaces(engine.catalog.places, region), [region]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const markers = markersRef.current;
    const keep = new Set<string>();
    for (const place of places) {
      keep.add(place.id);
      const isFound = discovered[place.id] != null;
      const isVisible = revealed[cellFor(place.lat, place.lng)] != null;
      const state = `${isFound}|${isVisible}`;
      const existing = markers.get(place.id);
      if (existing) {
        if (existing.state !== state) {
          paintMarker(existing.el, place, isFound, isVisible);
          existing.state = state;
        }
        continue;
      }
      const el = document.createElement('div');
      paintMarker(el, place, isFound, isVisible);
      // Keep marker taps away from the map's own click (sim walk target / deselect).
      for (const type of ['mousedown', 'touchstart', 'pointerdown', 'dblclick'] as const) {
        el.addEventListener(type, (e) => e.stopPropagation());
      }
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.current.onSelectPlace(place.id);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([place.lng, place.lat]).addTo(map);
      markers.set(place.id, { marker, el, state });
    }
    for (const [id, m] of markers) {
      if (!keep.has(id)) {
        m.marker.remove();
        markers.delete(id);
      }
    }
  }, [places, discovered, revealed, ready]);

  // Player marker (real GPS or simulated walker) and follow camera.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const show = position && (simulate || permission === 'granted');
    if (!show) {
      walkerRef.current?.remove();
      walkerRef.current = null;
      return;
    }
    if (!walkerRef.current) {
      const el = document.createElement('div');
      Object.assign(el.style, {
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: color.gilt,
        border: `3px solid ${color.parchment}`,
        boxShadow: '0 0 0 6px rgba(226,177,77,0.25)',
        pointerEvents: 'none',
        zIndex: '5',
      });
      walkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([position.lng, position.lat]).addTo(map);
    } else {
      walkerRef.current.setLngLat([position.lng, position.lat]);
    }
    if (followRef.current) map.easeTo({ center: [position.lng, position.lat], duration: 600 });
  }, [position, permission, simulate, ready]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0, isolation: 'isolate', background: color.night }}
      aria-label="Mapa Prahy"
    />
  );
});

function regionOf(map: maplibregl.Map): Region {
  const b = map.getBounds();
  return {
    latitude: (b.getNorth() + b.getSouth()) / 2,
    longitude: (b.getEast() + b.getWest()) / 2,
    latitudeDelta: b.getNorth() - b.getSouth(),
    longitudeDelta: b.getEast() - b.getWest(),
  };
}

function emptyFc(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

function polygon(rings: number[][][]): GeoJSON.Feature {
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: rings } };
}

function setData(map: maplibregl.Map, id: string, features: GeoJSON.Feature[]) {
  (map.getSource(id) as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features });
}

const HEX_CLIP = 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)';

/** Pointy-top hexagon marker, matching the native HexShape. */
function paintMarker(el: HTMLDivElement, place: Place, found: boolean, visible: boolean) {
  const tint = rarityColor[place.rarity];
  const big = place.rarity === 'legendary' || place.rarity === 'epic';
  const size = big ? 38 : 30;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', place.nameCs);
  el.title = place.nameCs;
  Object.assign(el.style, {
    width: `${size}px`,
    height: `${size}px`,
    cursor: 'pointer',
    clipPath: HEX_CLIP,
    background: tint,
    display: 'grid',
    placeItems: 'center',
    opacity: found || visible ? '1' : '0.7',
    zIndex: big ? '2' : '1',
  });
  el.innerHTML = '';
  const inner = document.createElement('div');
  Object.assign(inner.style, {
    width: `${size - 5}px`,
    height: `${size - 5}px`,
    clipPath: HEX_CLIP,
    background: found ? tint : color.night,
    color: found ? color.ink : tint,
    display: 'grid',
    placeItems: 'center',
    font: `${big ? 17 : 14}px ${place.type === 'metro' ? font.displayBlack : font.bodyBold}, system-ui, sans-serif`,
    lineHeight: '1',
  });
  inner.textContent = found || visible ? PLACE_GLYPH[place.type] : '?';
  el.appendChild(inner);
}
