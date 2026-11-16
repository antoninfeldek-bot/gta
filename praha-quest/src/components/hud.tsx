import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GAME_CONFIG, levelProgress } from '@/game';
import { formatNumber, t } from '@/i18n';
import { useGameStore } from '@/store/game-store';
import { color, font, radius, size, space } from '@/theme';
import { HexShape } from './hex-shape';

/** Top-of-map HUD: the level seal with its XP bar, then coins and today's steps. */
export function Hud() {
  const insets = useSafeAreaInsets();
  const xp = useGameStore((s) => s.game.xp);
  const coins = useGameStore((s) => s.game.coins);
  const steps = useGameStore((s) => s.game.daily.steps);
  const capped = useGameStore((s) => s.game.daily.xpSteps >= GAME_CONFIG.steps.dailyXpCap);
  const progress = levelProgress(xp);

  const fill = useSharedValue(progress.ratio);
  useEffect(() => {
    fill.value = withSpring(progress.ratio, { damping: 18, stiffness: 120 });
  }, [fill, progress.ratio]);
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.min(1, fill.value) * 100}%` }));

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
      <View style={styles.row} pointerEvents="none">
        <View style={styles.seal} accessibilityLabel={`${t.hud.level} ${progress.level}`}>
          <HexShape size={62} fill={color.night} stroke={color.gilt} strokeWidth={2.5} />
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Text style={styles.sealNumber}>{progress.level}</Text>
          </View>
        </View>
        <View style={styles.xpCol}>
          <Text style={styles.levelLabel}>
            {t.hud.level} {progress.level}
          </Text>
          <View style={styles.track}>
            <Animated.View style={[styles.bar, barStyle]} />
          </View>
          <Text style={styles.xpText}>
            {progress.needed > 0 ? t.hud.xpToNext(progress.current, progress.needed) : t.hud.maxLevel}
          </Text>
        </View>
        <View style={styles.stats}>
          <Text style={styles.statValue}>
            {formatNumber(coins)} <Text style={styles.statUnit}>{t.hud.coins}</Text>
          </Text>
          <Text style={[styles.statValue, capped && { color: color.parchmentDim }]}>
            {formatNumber(steps)} <Text style={styles.statUnit}>{t.hud.stepsToday}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: 'rgba(15,28,38,0.92)',
    borderRadius: radius.panel,
    paddingVertical: space.sm,
    paddingLeft: space.sm,
    paddingRight: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.slateHigh,
  },
  seal: { width: 62, height: 62 },
  center: { alignItems: 'center', justifyContent: 'center' },
  sealNumber: { fontFamily: font.displayBlack, fontSize: 24, color: color.gilt, marginTop: -1 },
  xpCol: { flex: 1, gap: 5 },
  levelLabel: { fontFamily: font.display, fontSize: size.body, color: color.parchment },
  track: { height: 6, borderRadius: 3, backgroundColor: color.slateHigh, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: color.gilt, borderRadius: 3 },
  xpText: { fontFamily: font.body, fontSize: size.caption, color: color.parchmentDim },
  stats: { alignItems: 'flex-end', gap: 2 },
  statValue: { fontFamily: font.bodyBold, fontSize: size.small, color: color.parchment, fontVariant: ['tabular-nums'] },
  statUnit: { fontFamily: font.body, fontSize: size.caption, color: color.parchmentDim },
});
