import { StyleSheet, Text, View } from 'react-native';
import { Hud } from '@/components/hud';
import { PlaceCard } from '@/components/place-card';
import { Toasts } from '@/components/toasts';
import { t } from '@/i18n';
import { engine } from '@/store/game-store';
import { color, font, size, space } from '@/theme';

/** react-native-maps has no web build; the web preview shows the HUD and a sample card. */
export function MapScreen() {
  const sample = engine.catalog.places.find((p) => p.rarity === 'legendary') ?? null;
  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.title}>{t.web.mapUnavailable}</Text>
        <Text style={styles.body}>{t.web.mapUnavailableBody}</Text>
      </View>
      <Hud />
      <Toasts />
      {sample ? (
        <View style={styles.bottom}>
          <PlaceCard place={sample} distance={null} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.night },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  title: { fontFamily: font.display, fontSize: size.headline, color: color.parchment, textAlign: 'center' },
  body: { fontFamily: font.body, fontSize: size.body, lineHeight: 23, color: color.parchmentDim, textAlign: 'center', maxWidth: 340 },
  bottom: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.md },
});
