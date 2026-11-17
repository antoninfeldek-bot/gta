import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GAME_CONFIG, levelProgress, rankTitle } from '@/game';
import { formatNumber, t, tc } from '@/i18n';
import { useGameStore } from '@/store/game-store';
import { color, font, frame, radius, size, space } from '@/theme';
import { CoatOfArms } from './coat-of-arms';
import { HousePlate } from './house-plate';

/** Top-of-map HUD as an enamel plate: coat of arms, level plate, rank, XP bar, coins and steps. */
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
    <View style={[styles.wrap, { paddingTop: insets.top + space.sm }]} pointerEvents="none">
      <View style={styles.plate}>
        <CoatOfArms size={30} />
        <HousePlate value={progress.level} size={44} />
        <View style={styles.xpCol}>
          <Text style={styles.rank} numberOfLines={1}>
            {tc.ranks[rankTitle(progress.level)].toLocaleUpperCase('cs')}
          </Text>
          <View style={styles.track}>
            <Animated.View style={[styles.bar, barStyle]} />
          </View>
          <Text style={styles.xpText}>{progress.needed > 0 ? t.hud.xpToNext(progress.current, progress.needed) : t.hud.maxLevel}</Text>
        </View>
        <View style={styles.stats}>
          <Text style={styles.statValue}>
            {formatNumber(coins)} <Text style={styles.statUnit}>{t.hud.coins}</Text>
          </Text>
          <Text style={[styles.statValue, capped && { color: color.inkMute }]}>
            {formatNumber(steps)} <Text style={styles.statUnit}>{t.hud.stepsToday}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: space.md },
  plate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.enamel,
    borderColor: color.signRed,
    borderWidth: frame,
    borderRadius: radius.plate,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  xpCol: { flex: 1, gap: 3, minWidth: 0 },
  rank: { fontFamily: font.signHeavy, fontSize: 17, letterSpacing: 0.6, color: color.ink },
  track: { height: 6, borderRadius: 3, backgroundColor: color.enamelShade, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: color.signRed, borderRadius: 3 },
  xpText: { fontFamily: font.bodyMedium, fontSize: size.caption, color: color.inkSoft, fontVariant: ['tabular-nums'] },
  stats: { alignItems: 'flex-end', gap: 1 },
  statValue: { fontFamily: font.signHeavy, fontSize: 17, color: color.ink, fontVariant: ['tabular-nums'] },
  statUnit: { fontFamily: font.bodyMedium, fontSize: 11, color: color.inkSoft },
});
