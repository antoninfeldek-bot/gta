import type { MapStyleElement } from 'react-native-maps';

/**
 * Google Maps style (Android): Prague at night. The river is the darkest
 * thing on the map, streets are faint slate lines, and nearly every POI and
 * transit icon is hidden so game markers own the map.
 */
export const NIGHT_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#14232E' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7F8E95' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F1C26' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#5F7079' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#16302C' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1E3241' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#14232E' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2A4052' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#081219' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3E5563' }] },
];
