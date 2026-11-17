import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { APP_CONFIG } from '@/app-config';
import { HousePlate } from '@/components/house-plate';
import { Plate, Screen, SectionTitle } from '@/components/screen';
import { StreetSign } from '@/components/street-sign';
import { ITEM_IDS, ITEM_RARITY, levelProgress, nextRank, rankTitle } from '@/game';
import { fmtDistance, formatNumber, t, tc } from '@/i18n';
import { useGameStore } from '@/store/game-store';
import { color, font, radius, rarityColor, size, space } from '@/theme';

export function ProfileScreen() {
  const game = useGameStore((s) => s.game);
  const settings = useGameStore((s) => s.settings);
  const stepSource = useGameStore((s) => s.stepSource);
  const setSetting = useGameStore((s) => s.setSetting);
  const reset = useGameStore((s) => s.reset);
  const [confirming, setConfirming] = useState(false);
  const progress = levelProgress(game.xp);
  const rank = tc.ranks[rankTitle(progress.level)];
  const upcoming = nextRank(progress.level);
  const rejected = Object.values(game.stats.rejectedFixes).reduce((a, b) => a + (b ?? 0), 0);

  const stats: [string, string][] = [
    [t.profile.totalSteps, formatNumber(game.totalSteps)],
    [t.profile.walked, fmtDistance(game.stats.walkedMeters)],
    [t.profile.hexes, formatNumber(Object.keys(game.revealedHexes).length)],
    [t.profile.places, formatNumber(Object.keys(game.places).length)],
    [t.profile.sets, formatNumber(Object.keys(game.completedSets).length)],
    [t.profile.coins, formatNumber(game.coins)],
  ];
  const owned = ITEM_IDS.filter((id) => (game.inventory[id] ?? 0) > 0);

  return (
    <Screen title={t.profile.title}>
      <View style={styles.idRow}>
        <HousePlate value={progress.level} size={76} caption="LEVEL" />
        <View style={{ flex: 1, gap: 4 }}>
          <StreetSign district="Titul" name={rank} size="md" />
          <Text style={styles.small}>
            {progress.needed > 0 ? t.hud.xpToNext(progress.current, progress.needed) : t.hud.maxLevel}
            {upcoming ? `. Další titul ${tc.ranks[upcoming.id]} na levelu ${upcoming.minLevel}.` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {stats.map(([label, value]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <SectionTitle hint={owned.length === 0 ? t.profile.inventoryEmpty : undefined}>{t.profile.inventory}</SectionTitle>
      {owned.map((id) => (
        <Plate key={id} tone={rarityColor[ITEM_RARITY[id]]} style={styles.item}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{t.items[id].name}</Text>
            <Text style={styles.small}>{t.items[id].description}</Text>
          </View>
          <Text style={styles.itemCount}>×{game.inventory[id]}</Text>
        </Plate>
      ))}

      <SectionTitle>{t.profile.settings}</SectionTitle>
      <Toggle label={t.profile.sound} value={settings.sound} onChange={(v) => setSetting('sound', v)} />
      <Toggle label={t.profile.haptics} value={settings.haptics} onChange={(v) => setSetting('haptics', v)} />
      {APP_CONFIG.allowSimulatedWalk ? (
        <Toggle label={t.profile.simulate} hint={t.profile.simulateHint} value={settings.simulate} onChange={(v) => setSetting('simulate', v)} />
      ) : null}
      <View style={styles.infoRow}>
        <Text style={styles.label}>{t.profile.stepSource}</Text>
        <Text style={styles.small}>{stepSource === 'pedometer' ? t.profile.stepSourcePedometer : t.profile.stepSourceGps}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>{t.profile.rejected}</Text>
        <Text style={styles.small}>{formatNumber(rejected)}</Text>
      </View>

      {confirming ? (
        <Plate tone={color.signRed}>
          <Text style={styles.label}>{t.profile.resetConfirmTitle}</Text>
          <Text style={styles.small}>{t.profile.resetConfirmBody}</Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Pressable style={[styles.btn, { backgroundColor: color.signRed }]} onPress={() => (reset(), setConfirming(false))}>
              <Text style={[styles.btnText, { color: color.white }]}>{t.profile.resetConfirm}</Text>
            </Pressable>
            <Pressable style={[styles.btn, { backgroundColor: color.enamelShade }]} onPress={() => setConfirming(false)}>
              <Text style={styles.btnText}>{t.profile.cancel}</Text>
            </Pressable>
          </View>
        </Plate>
      ) : (
        <Pressable onPress={() => setConfirming(true)} style={styles.reset} accessibilityRole="button">
          <Text style={styles.resetText}>{t.profile.reset}</Text>
        </Pressable>
      )}
      <Text style={styles.credit}>{t.profile.dataSource}</Text>
    </Screen>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Plate style={styles.toggle}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.small}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: color.signRed, false: color.enamelEdge }}
        thumbColor={color.white}
        {...({ activeThumbColor: color.white } as object)}
        accessibilityLabel={label}
      />
    </Plate>
  );
}

const styles = StyleSheet.create({
  idRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  small: { fontFamily: font.body, fontSize: size.small, lineHeight: 20, color: color.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: color.enamel,
    borderRadius: radius.plate,
    borderWidth: 2,
    borderColor: color.enamelEdge,
    padding: space.md,
  },
  statValue: { fontFamily: font.signHeavy, fontSize: 26, color: color.ink, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: font.body, fontSize: 12, color: color.inkSoft },
  item: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontFamily: font.signHeavy, fontSize: 18, color: color.ink },
  itemCount: { fontFamily: font.signHeavy, fontSize: 24, color: color.signRed },
  toggle: { flexDirection: 'row', alignItems: 'center' },
  label: { fontFamily: font.bodyBold, fontSize: size.body, color: color.ink },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.xs },
  reset: { alignSelf: 'flex-start', paddingVertical: space.sm },
  resetText: { fontFamily: font.bodyBold, fontSize: size.body, color: color.signRed },
  btn: { flex: 1, borderRadius: radius.control, paddingVertical: 12, alignItems: 'center' },
  btnText: { fontFamily: font.signHeavy, fontSize: 17, color: color.ink },
  credit: { fontFamily: font.body, fontSize: size.caption, color: color.inkMute },
});
