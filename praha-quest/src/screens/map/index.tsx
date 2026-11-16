import * as Linking from 'expo-linking';
import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_CONFIG } from '@/app-config';
import { Hud } from '@/components/hud';
import { GameMap } from '@/components/map/game-map';
import type { GameMapHandle } from '@/components/map/game-map.types';
import { PlaceCard } from '@/components/place-card';
import { Toasts } from '@/components/toasts';
import { distanceM, type Place } from '@/game';
import { useNearbyPlaces } from '@/hooks/use-nearby-places';
import { t } from '@/i18n';
import { engine, useGameStore } from '@/store/game-store';
import { useSensorStore } from '@/store/sensor-store';
import { color, font, radius, size, space } from '@/theme';

export function MapScreen() {
  const mapRef = useRef<GameMapHandle>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const simulate = useGameStore((s) => s.settings.simulate && APP_CONFIG.allowSimulatedWalk);
  const simTarget = useGameStore((s) => s.simTarget);
  const position = useSensorStore((s) => s.position);
  const permission = useSensorStore((s) => s.permission);
  const lastReject = useGameStore((s) => s.lastReject);

  const nearby = useNearbyPlaces(position, 1);
  const selected = selectedId ? engine.placeById.get(selectedId) ?? null : null;
  const cardPlace: Place | null = selected ?? nearby[0]?.place ?? null;
  const cardDistance = cardPlace && position ? distanceM(position, cardPlace) : null;

  const onSelectPlace = useCallback((id: string) => setSelectedId(id), []);
  const onPressMap = useCallback(
    (coordinate: { lat: number; lng: number }) => {
      if (simulate) useGameStore.getState().setSimTarget(coordinate);
      setSelectedId(null);
    },
    [simulate],
  );

  const showWeak = lastReject && Date.now() - lastReject.at < 8_000 && lastReject.reason === 'accuracy';

  return (
    <View style={styles.root}>
      <GameMap ref={mapRef} onSelectPlace={onSelectPlace} onPressMap={onPressMap} />

      <Hud />
      <Toasts />

      <View style={styles.bottom} pointerEvents="box-none">
        {simulate ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              {simTarget && position ? t.sim.walkingTo(distanceM(position, simTarget)) : t.sim.banner}
            </Text>
          </View>
        ) : null}
        {showWeak ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{t.location.weakSignal}</Text>
          </View>
        ) : null}
        <View style={styles.fabRow} pointerEvents="box-none">
          <Pressable
            onPress={() => mapRef.current?.recenter()}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel={t.location.centerOnMe}
          >
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

function PermissionCard() {
  const askAgain = useSensorStore((s) => s.askAgain);
  const setSetting = useGameStore((s) => s.setSetting);
  const web = Platform.OS === 'web';
  return (
    <View style={styles.permission}>
      <Text style={styles.permTitle}>{t.location.deniedTitle}</Text>
      <Text style={styles.permBody}>{web ? t.location.deniedBodyWeb : t.location.deniedBody}</Text>
      <View style={styles.permRow}>
        {web ? null : (
          <Pressable style={styles.permButton} onPress={() => Linking.openSettings()} accessibilityRole="button">
            <Text style={styles.permButtonText}>{t.location.openSettings}</Text>
          </Pressable>
        )}
        {APP_CONFIG.allowSimulatedWalk ? (
          <Pressable style={[styles.permButton, web ? null : styles.permGhost]} onPress={() => setSetting('simulate', true)} accessibilityRole="button">
            <Text style={[styles.permButtonText, web ? null : { color: color.parchment }]}>{t.location.trySimulation}</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.permButton, styles.permGhost]} onPress={askAgain} accessibilityRole="button">
            <Text style={[styles.permButtonText, { color: color.parchment }]}>{t.location.askButton}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.night, overflow: 'hidden' },
  bottom: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.md, gap: space.sm },
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
  banner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(24,42,55,0.95)',
    borderRadius: radius.chip,
    paddingVertical: 6,
    paddingHorizontal: space.md,
  },
  bannerText: { fontFamily: font.bodyMedium, fontSize: size.caption, color: color.patina },
  hint: { backgroundColor: color.slate, borderRadius: radius.panel, padding: space.lg },
  hintText: { fontFamily: font.body, fontSize: size.body, color: color.parchmentDim },
  permission: { backgroundColor: color.slate, borderRadius: radius.sheet, padding: space.lg, gap: space.sm },
  permTitle: { fontFamily: font.display, fontSize: size.title, color: color.parchment },
  permBody: { fontFamily: font.body, fontSize: size.small, lineHeight: 20, color: color.parchmentDim },
  permRow: { flexDirection: 'row', gap: space.sm },
  permButton: { flex: 1, backgroundColor: color.gilt, borderRadius: radius.control, paddingVertical: 12, alignItems: 'center' },
  permGhost: { backgroundColor: color.slateHigh },
  permButtonText: { fontFamily: font.bodyBold, fontSize: size.small, color: color.ink },
});
