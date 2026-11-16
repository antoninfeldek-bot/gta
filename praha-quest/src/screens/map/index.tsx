import * as Linking from 'expo-linking';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, type MapPressEvent, type Region } from 'react-native-maps';
import { APP_CONFIG } from '@/app-config';
import { NIGHT_MAP_STYLE } from '@/components/map/map-style';
import { FogLayer } from '@/components/map/fog-layer';
import { PlaceMarker } from '@/components/map/place-marker';
import { Hud } from '@/components/hud';
import { PlaceCard } from '@/components/place-card';
import { Toasts } from '@/components/toasts';
import { cellFor, distanceM, type Place, type PlaceRarity } from '@/game';
import { useNearbyPlaces } from '@/hooks/use-nearby-places';
import { t } from '@/i18n';
import { engine, useGameStore } from '@/store/game-store';
import { useSensorStore } from '@/store/sensor-store';
import { color, font, radius, size, space } from '@/theme';
import { regionBounds, inBounds } from '@/utils/fog';

const PRAGUE: Region = { latitude: 50.0875, longitude: 14.4213, latitudeDelta: 0.012, longitudeDelta: 0.012 };

/** Which rarities are drawn at a given zoom, so a zoomed-out map stays readable. */
function minRarityFor(latDelta: number): PlaceRarity {
  if (latDelta > 0.12) return 'legendary';
  if (latDelta > 0.06) return 'epic';
  if (latDelta > 0.03) return 'rare';
  return 'common';
}
const RANK: Record<PlaceRarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
const MAX_MARKERS = 120;

export function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(PRAGUE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const followRef = useRef(true);

  const revealed = useGameStore((s) => s.game.revealedHexes);
  const discovered = useGameStore((s) => s.game.places);
  const simulate = useGameStore((s) => s.settings.simulate && APP_CONFIG.allowSimulatedWalk);
  const simTarget = useGameStore((s) => s.simTarget);
  const setSimTarget = useGameStore((s) => s.setSimTarget);
  const position = useSensorStore((s) => s.position);
  const permission = useSensorStore((s) => s.permission);
  const lastReject = useGameStore((s) => s.lastReject);

  const nearby = useNearbyPlaces(position, 1);
  const selected = selectedId ? engine.placeById.get(selectedId) ?? null : null;
  const cardPlace: Place | null = selected ?? nearby[0]?.place ?? null;
  const cardDistance = cardPlace && position ? distanceM(position, cardPlace) : null;

  const visiblePlaces = useMemo(() => {
    const b = regionBounds(region, 0.2);
    const min = RANK[minRarityFor(region.latitudeDelta)];
    return engine.catalog.places
      .filter((p) => RANK[p.rarity] >= min && inBounds(b, p.lat, p.lng))
      .sort((a, b2) => RANK[b2.rarity] - RANK[a.rarity])
      .slice(0, MAX_MARKERS);
  }, [region]);

  const onPressMarker = useCallback((id: string) => setSelectedId(id), []);

  const onMapPress = (e: MapPressEvent) => {
    if (e.nativeEvent.action === 'marker-press') return;
    if (simulate) {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setSimTarget({ lat: latitude, lng: longitude });
    }
    setSelectedId(null);
  };

  const recenter = () => {
    followRef.current = true;
    if (position) {
      mapRef.current?.animateToRegion(
        { latitude: position.lat, longitude: position.lng, latitudeDelta: 0.008, longitudeDelta: 0.008 },
        450,
      );
    }
  };

  // Follow the player until they pan the map themselves.
  const followLat = position ? Number(position.lat.toFixed(5)) : null;
  const followLng = position ? Number(position.lng.toFixed(5)) : null;
  useEffect(() => {
    if (followLat == null || followLng == null || !followRef.current) return;
    mapRef.current?.animateCamera({ center: { latitude: followLat, longitude: followLng } }, { duration: 600 });
  }, [followLat, followLng]);

  const showWeak = lastReject && Date.now() - lastReject.at < 8_000 && lastReject.reason === 'accuracy';

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        customMapStyle={NIGHT_MAP_STYLE}
        userInterfaceStyle="dark"
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        initialRegion={PRAGUE}
        onRegionChangeComplete={setRegion}
        onPanDrag={() => (followRef.current = false)}
        onPress={onMapPress}
        showsUserLocation={!simulate && permission === 'granted'}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        showsCompass={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <FogLayer region={region} revealed={revealed} />
        {visiblePlaces.map((place) => (
          <PlaceMarker
            key={place.id}
            place={place}
            discovered={discovered[place.id] != null}
            visible={revealed[cellFor(place.lat, place.lng)] != null}
            onPress={onPressMarker}
          />
        ))}
        {simulate && position ? <SimWalker position={position} /> : null}
      </MapView>

      <Hud />
      <Toasts />

      <View style={[styles.bottom, { paddingBottom: space.md }]} pointerEvents="box-none">
        {simulate ? (
          <View style={styles.simBanner}>
            <Text style={styles.simText}>
              {simTarget && position ? t.sim.walkingTo(distanceM(position, simTarget)) : t.sim.banner}
            </Text>
          </View>
        ) : null}
        {showWeak ? (
          <View style={styles.simBanner}>
            <Text style={styles.simText}>{t.location.weakSignal}</Text>
          </View>
        ) : null}
        <View style={styles.fabRow} pointerEvents="box-none">
          <Pressable onPress={recenter} style={styles.fab} accessibilityRole="button" accessibilityLabel={t.location.centerOnMe}>
            <Text style={styles.fabGlyph}>◎</Text>
          </Pressable>
        </View>
        {permission === 'denied' && !simulate ? (
          <PermissionCard />
        ) : cardPlace ? (
          <PlaceCard place={cardPlace} distance={cardDistance} onClose={selected ? () => setSelectedId(null) : undefined} />
        ) : !position ? (
          <View style={styles.hint}>
            <Text style={styles.hintText}>{t.location.searching}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SimWalker({ position }: { position: { lat: number; lng: number } }) {
  return (
    <Marker coordinate={{ latitude: position.lat, longitude: position.lng }} anchor={{ x: 0.5, y: 0.5 }} zIndex={50} tracksViewChanges={false}>
      <View style={styles.walker} />
    </Marker>
  );
}

function PermissionCard() {
  const askAgain = useSensorStore((s) => s.askAgain);
  return (
    <View style={styles.permission}>
      <Text style={styles.permTitle}>{t.location.deniedTitle}</Text>
      <Text style={styles.permBody}>{t.location.deniedBody}</Text>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Pressable style={styles.permButton} onPress={() => Linking.openSettings()} accessibilityRole="button">
          <Text style={styles.permButtonText}>{t.location.openSettings}</Text>
        </Pressable>
        <Pressable style={[styles.permButton, styles.permGhost]} onPress={askAgain} accessibilityRole="button">
          <Text style={[styles.permButtonText, { color: color.parchment }]}>{t.location.askButton}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.night },
  bottom: { position: 'absolute', left: space.lg, right: space.lg, bottom: 0, gap: space.sm },
  fabRow: { alignItems: 'flex-end' },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.slate,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.slateHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGlyph: { fontSize: 22, color: color.gilt, marginTop: -2 },
  simBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(24,42,55,0.95)',
    borderRadius: radius.chip,
    paddingVertical: 6,
    paddingHorizontal: space.md,
  },
  simText: { fontFamily: font.bodyMedium, fontSize: size.caption, color: color.patina },
  hint: { backgroundColor: color.slate, borderRadius: radius.panel, padding: space.lg },
  hintText: { fontFamily: font.body, fontSize: size.body, color: color.parchmentDim },
  walker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: color.gilt,
    borderWidth: 3,
    borderColor: color.parchment,
  },
  permission: { backgroundColor: color.slate, borderRadius: radius.sheet, padding: space.lg, gap: space.sm },
  permTitle: { fontFamily: font.display, fontSize: size.title, color: color.parchment },
  permBody: { fontFamily: font.body, fontSize: size.small, lineHeight: 20, color: color.parchmentDim },
  permButton: { flex: 1, backgroundColor: color.gilt, borderRadius: radius.control, paddingVertical: 12, alignItems: 'center' },
  permGhost: { backgroundColor: color.slateHigh },
  permButtonText: { fontFamily: font.bodyBold, fontSize: size.small, color: color.ink },
});

