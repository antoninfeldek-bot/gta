import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, type MapPressEvent, type Region } from 'react-native-maps';
import { APP_CONFIG } from '@/app-config';
import { cellFor } from '@/game';
import { engine, useGameStore } from '@/store/game-store';
import { useSensorStore } from '@/store/sensor-store';
import { color } from '@/theme';
import { PRAGUE_REGION, visiblePlaces } from '@/utils/places';
import { FogLayer } from './fog-layer';
import type { GameMapHandle, GameMapProps } from './game-map.types';
import { NIGHT_MAP_STYLE } from './map-style';
import { PlaceMarker } from './place-marker';

/** Native map (react-native-maps): Apple Maps on iOS, Google Maps on Android. */
export const GameMap = forwardRef<GameMapHandle, GameMapProps>(function GameMap({ onSelectPlace, onPressMap }, ref) {
  const mapRef = useRef<MapView>(null);
  const followRef = useRef(true);
  const [region, setRegion] = useState<Region>(PRAGUE_REGION);
  const revealed = useGameStore((s) => s.game.revealedHexes);
  const discovered = useGameStore((s) => s.game.places);
  const simulate = useGameStore((s) => s.settings.simulate && APP_CONFIG.allowSimulatedWalk);
  const position = useSensorStore((s) => s.position);
  const permission = useSensorStore((s) => s.permission);

  const places = useMemo(() => visiblePlaces(engine.catalog.places, region), [region]);

  useImperativeHandle(ref, () => ({
    recenter: () => {
      followRef.current = true;
      const p = useSensorStore.getState().position;
      if (p) mapRef.current?.animateToRegion({ latitude: p.lat, longitude: p.lng, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 450);
    },
  }));

  // Follow the player until they pan the map themselves.
  const followLat = position ? Number(position.lat.toFixed(5)) : null;
  const followLng = position ? Number(position.lng.toFixed(5)) : null;
  useEffect(() => {
    if (followLat == null || followLng == null || !followRef.current) return;
    mapRef.current?.animateCamera({ center: { latitude: followLat, longitude: followLng } }, { duration: 600 });
  }, [followLat, followLng]);

  const onPress = useCallback(
    (e: MapPressEvent) => {
      if (e.nativeEvent.action === 'marker-press') return;
      onPressMap({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude });
    },
    [onPressMap],
  );

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
      customMapStyle={NIGHT_MAP_STYLE}
      userInterfaceStyle="dark"
      mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
      initialRegion={PRAGUE_REGION}
      onRegionChangeComplete={setRegion}
      onPanDrag={() => (followRef.current = false)}
      onPress={onPress}
      showsUserLocation={!simulate && permission === 'granted'}
      showsMyLocationButton={false}
      showsPointsOfInterests={false}
      showsCompass={false}
      toolbarEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <FogLayer region={region} revealed={revealed} />
      {places.map((place) => (
        <PlaceMarker
          key={place.id}
          place={place}
          discovered={discovered[place.id] != null}
          visible={revealed[cellFor(place.lat, place.lng)] != null}
          onPress={onSelectPlace}
        />
      ))}
      {simulate && position ? (
        <Marker coordinate={{ latitude: position.lat, longitude: position.lng }} anchor={{ x: 0.5, y: 0.5 }} zIndex={50} tracksViewChanges={false}>
          <View style={styles.walker} />
        </Marker>
      ) : null}
    </MapView>
  );
});

const styles = StyleSheet.create({
  walker: { width: 18, height: 18, borderRadius: 9, backgroundColor: color.signRed, borderWidth: 3, borderColor: color.enamel },
});
