import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_CONFIG } from '@/app-config';
import { ITEM_IDS, ITEM_RARITY, levelProgress } from '@/game';
import { formatNumber, fmtDistance, t } from '@/i18n';
import { useGameStore, type Settings } from '@/store/game-store';
import { color, font, radius, rarityColor, size, space } from '@/theme';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const game = useGameStore((s) => s.game);
  const settings = useGameStore((s) => s.settings);
  const stepSource = useGameStore((s) => s.stepSource);
  const setSetting = useGameStore((s) => s.setSetting);
  const reset = useGameStore((s) => s.reset);
  const progress = levelProgress(game.xp);
  const rejected = Object.values(game.stats.rejectedFixes).reduce((a, b) => a + (b ?? 0), 0);

  const stats: [string, string][] = [
    [t.profile.totalSteps, formatNumber(game.totalSteps)],
    [t.profile.walked, fmtDistance(game.stats.walkedMeters)],
    [t.profile.hexes, formatNumber(Object.keys(game.revealedHexes).length)],
    [t.profile.places, formatNumber(Object.keys(game.places).length)],
    [t.profile.sets, formatNumber(Object.keys(game.completedSets).length)],
    [t.profile.coins, formatNumber(game.coins)],
  ];

  const confirmReset = () => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(t.profile.resetConfirmTitle)) reset();
      return;
    }
    Alert.alert(t.profile.resetConfirmTitle, t.profile.resetConfirmBody, [
      { text: t.profile.cancel, style: 'cancel' },
      { text: t.profile.resetConfirm, style: 'destructive', onPress: reset },
    ]);
  };

  const owned = ITEM_IDS.filter((id) => (game.inventory[id] ?? 0) > 0);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: space.xxl, paddingHorizontal: space.lg, gap: space.xl }}
    >
      <View style={{ gap: space.xs }}>
        <Text style={styles.h1}>{t.profile.title}</Text>
        <Text style={styles.lead}>
          {t.hud.level} {progress.level}
          {progress.needed > 0 ? `, ${t.hud.xpToNext(progress.current, progress.needed)}` : ''}
        </Text>
      </View>

      <View style={styles.grid}>
        {stats.map(([label, value]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: space.md }}>
        <Text style={styles.h2}>{t.profile.inventory}</Text>
        {owned.length === 0 ? (
          <Text style={styles.muted}>{t.profile.inventoryEmpty}</Text>
        ) : (
          owned.map((id) => (
            <View key={id} style={styles.item}>
              <View style={[styles.itemMark, { backgroundColor: rarityColor[ITEM_RARITY[id]] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{t.items[id].name}</Text>
                <Text style={styles.muted}>{t.items[id].description}</Text>
              </View>
              <Text style={styles.itemCount}>×{game.inventory[id]}</Text>
            </View>
          ))
        )}
      </View>

      <View style={{ gap: space.sm }}>
        <Text style={styles.h2}>{t.profile.settings}</Text>
        <Toggle label={t.profile.sound} value={settings.sound} onChange={(v) => setSetting('sound', v)} />
        <Toggle label={t.profile.haptics} value={settings.haptics} onChange={(v) => setSetting('haptics', v)} />
        {APP_CONFIG.allowSimulatedWalk ? (
          <Toggle
            label={t.profile.simulate}
            hint={t.profile.simulateHint}
            value={settings.simulate}
            onChange={(v) => setSetting('simulate' as keyof Settings, v)}
          />
        ) : null}
        <View style={styles.infoRow}>
          <Text style={styles.toggleLabel}>{t.profile.stepSource}</Text>
          <Text style={styles.muted}>{stepSource === 'pedometer' ? t.profile.stepSourcePedometer : t.profile.stepSourceGps}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.toggleLabel}>{t.profile.rejected}</Text>
          <Text style={styles.muted}>{formatNumber(rejected)}</Text>
        </View>
      </View>

      <Pressable onPress={confirmReset} style={styles.reset} accessibilityRole="button">
        <Text style={styles.resetText}>{t.profile.reset}</Text>
      </Pressable>
      <Text style={styles.credit}>{t.profile.dataSource}</Text>
    </ScrollView>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.muted}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: color.giltDeep, false: color.slateHigh }}
        thumbColor={value ? color.gilt : color.parchmentDim}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.night },
  h1: { fontFamily: font.display, fontSize: size.hero, lineHeight: 50, color: color.parchment },
  h2: { fontFamily: font.display, fontSize: size.title, color: color.parchment },
  lead: { fontFamily: font.bodyMedium, fontSize: size.body, color: color.gilt },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: { flexBasis: '48%', flexGrow: 1, backgroundColor: color.slate, borderRadius: radius.panel, padding: space.lg, gap: 2 },
  statValue: { fontFamily: font.display, fontSize: size.headline, color: color.parchment, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: font.body, fontSize: size.small, color: color.parchmentDim },
  muted: { fontFamily: font.body, fontSize: size.small, lineHeight: 20, color: color.parchmentDim },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.slate, borderRadius: radius.control, padding: space.md },
  itemMark: { width: 10, height: 34, borderRadius: 3 },
  itemName: { fontFamily: font.bodyBold, fontSize: size.body, color: color.parchment },
  itemCount: { fontFamily: font.display, fontSize: size.title, color: color.gilt },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.slate, borderRadius: radius.control, padding: space.md },
  toggleLabel: { fontFamily: font.bodyMedium, fontSize: size.body, color: color.parchment },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.md, paddingVertical: space.sm },
  reset: { alignSelf: 'flex-start', paddingVertical: space.sm },
  resetText: { fontFamily: font.bodyMedium, fontSize: size.body, color: color.danger },
  credit: { fontFamily: font.body, fontSize: size.caption, color: color.parchmentDim },
});
