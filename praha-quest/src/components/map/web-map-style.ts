/**
 * Night style for the web map, built on OpenFreeMap vector tiles
 * (OpenStreetMap data, OpenMapTiles schema, no API key, no usage limits).
 * Colours follow the game palette: river-slate land, near-black Vltava,
 * faint slate streets and quiet parchment labels.
 */
import type { ExpressionSpecification, LayerSpecification, SourceSpecification } from 'maplibre-gl';

export const BASEMAP_SOURCE: SourceSpecification = {
  type: 'vector',
  url: 'https://tiles.openfreemap.org/planet',
  attribution:
    '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
};

export const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

const NAME: ExpressionSpecification = ['coalesce', ['get', 'name:cs'], ['get', 'name']];
const FONT = ['Noto Sans Regular'];
const FONT_ITALIC = ['Noto Sans Italic'];

const ROADS_MAJOR = ['motorway', 'trunk', 'primary'];
const ROADS_MID = ['secondary', 'tertiary'];
const ROADS_MINOR = ['minor', 'service', 'track'];

export const BASEMAP_LAYERS: LayerSpecification[] = [
  {
    id: 'landcover-green',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landcover',
    filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood']]],
    paint: { 'fill-color': '#15302B', 'fill-opacity': 0.8 },
  },
  {
    id: 'park',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'park',
    paint: { 'fill-color': '#16302C', 'fill-opacity': 0.9 },
  },
  {
    id: 'landuse',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: ['in', ['get', 'class'], ['literal', ['cemetery', 'pitch', 'stadium', 'grass']]],
    paint: { 'fill-color': '#16302C', 'fill-opacity': 0.6 },
  },
  {
    id: 'water',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'water',
    paint: { 'fill-color': '#071017' },
  },
  {
    id: 'waterway',
    type: 'line',
    source: 'basemap',
    'source-layer': 'waterway',
    paint: { 'line-color': '#071017', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 17, 3] },
  },
  {
    id: 'building',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'building',
    minzoom: 14,
    paint: { 'fill-color': '#1A2C39', 'fill-outline-color': '#21374A' },
  },
  {
    id: 'road-minor',
    type: 'line',
    source: 'basemap',
    'source-layer': 'transportation',
    minzoom: 13,
    filter: ['all', ['in', ['get', 'class'], ['literal', ROADS_MINOR]], ['!=', ['get', 'brunnel'], 'tunnel']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#22374A', 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0.5, 18, 8] },
  },
  {
    id: 'road-path',
    type: 'line',
    source: 'basemap',
    'source-layer': 'transportation',
    minzoom: 15,
    filter: ['==', ['get', 'class'], 'path'],
    paint: { 'line-color': '#2A4052', 'line-width': 1, 'line-dasharray': [2, 2] },
  },
  {
    id: 'road-mid',
    type: 'line',
    source: 'basemap',
    'source-layer': 'transportation',
    filter: ['all', ['in', ['get', 'class'], ['literal', ROADS_MID]], ['!=', ['get', 'brunnel'], 'tunnel']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#2A4052', 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 11, 0.6, 18, 12] },
  },
  {
    id: 'road-major',
    type: 'line',
    source: 'basemap',
    'source-layer': 'transportation',
    filter: ['all', ['in', ['get', 'class'], ['literal', ROADS_MAJOR]], ['!=', ['get', 'brunnel'], 'tunnel']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#33495C', 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 10, 0.8, 18, 16] },
  },
  {
    id: 'rail',
    type: 'line',
    source: 'basemap',
    'source-layer': 'transportation',
    filter: ['all', ['==', ['get', 'class'], 'rail'], ['!=', ['get', 'brunnel'], 'tunnel']],
    paint: { 'line-color': '#2A3B48', 'line-width': 1 },
  },
  {
    id: 'water-name',
    type: 'symbol',
    source: 'basemap',
    'source-layer': 'water_name',
    layout: {
      'text-field': NAME,
      'text-font': FONT_ITALIC,
      'text-size': 13,
      'symbol-placement': 'line',
      'text-letter-spacing': 0.2,
    },
    paint: { 'text-color': '#4E6A7A', 'text-halo-color': '#071017', 'text-halo-width': 1 },
  },
  {
    id: 'street-name',
    type: 'symbol',
    source: 'basemap',
    'source-layer': 'transportation_name',
    minzoom: 15,
    layout: { 'text-field': NAME, 'text-font': FONT, 'text-size': 11, 'symbol-placement': 'line' },
    paint: { 'text-color': '#7F8E95', 'text-halo-color': '#0F1C26', 'text-halo-width': 1.2 },
  },
  {
    id: 'place-name',
    type: 'symbol',
    source: 'basemap',
    'source-layer': 'place',
    filter: ['in', ['get', 'class'], ['literal', ['suburb', 'quarter', 'neighbourhood']]],
    layout: { 'text-field': NAME, 'text-font': FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11, 15, 14] },
    paint: { 'text-color': '#8D9BA1', 'text-halo-color': '#0F1C26', 'text-halo-width': 1.5 },
  },
];
