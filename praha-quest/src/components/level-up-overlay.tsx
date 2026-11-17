import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { rankTitle } from '@/game';
import { t, tc } from '@/i18n';
import { useFeedStore } from '@/store/feed-store';
import { color, font, radius, size, space } from '@/theme';
import { CoatOfArms } from './coat-of-arms';
import { HousePlate } from './house-plate';
import { StreetSign } from './street-sign';

/**
 * The game's one big moment: the coat of arms drops in, the blue house-number
 * plate with the new level swings onto the wall, and a street sign names the
 * new rank when it changes.
 */
export function LevelUpOverlay() {
  const level = useFeedStore((s) => s.levelUp);
  const dismiss = useFeedStore((s) => s.dismissLevelUp);
  const reduced = useReducedMotion();
  const arms = useSharedValue(0);
  const plate = useSharedValue(0);
  const text = useSharedValue(0);

  useEffect(() => {
    if (level == null) return;
    if (reduced) {
      arms.value = 1;
      plate.value = 1;
      text.value = 1;
      return;
    }
    arms.value = 0;
    plate.value = 0;
    text.value = 0;
    arms.value = withSpring(1, { damping: 12, stiffness: 120 });
    plate.value = withDelay(220, withSequence(withSpring(1.08, { damping: 8, stiffness: 160 }), withSpring(1, { damping: 14 })));
    text.value = withDelay(520, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [level, reduced, arms, plate, text]);

  const armsStyle = useAnimatedStyle(() => ({ opacity: arms.value, transform: [{ translateY: (1 - arms.value) * -40 }] }));
  const plateStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, plate.value * 1.5),
    transform: [{ scale: plate.value }, { rotate: `${(1 - Math.min(1, plate.value)) * -12}deg` }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: text.value, transform: [{ translateY: (1 - text.value) * 12 }] }));

  const rankChanged = level != null && level > 1 && rankTitle(level) !== rankTitle(level - 1);

  return (
    <Modal visible={level != null} transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={dismiss} accessibilityRole="button" accessibilityLabel={t.rewards.levelUpButton}>
        <Animated.View style={armsStyle}>
          <CoatOfArms size={72} />
        </Animated.View>
        <Animated.View style={[styles.plateWrap, plateStyle]}>
          <HousePlate value={level ?? ''} size={128} />
        </Animated.View>
        <Animated.View style={[styles.copy, textStyle]}>
          <Text style={styles.title}>{t.rewards.levelUp.toLocaleUpperCase('cs')}</Text>
          {rankChanged && level != null ? (
            <StreetSign district={t.rewards.newRank} name={tc.ranks[rankTitle(level)]} size="md" style={styles.rankSign} />
          ) : null}
          <Text style={styles.body}>{level != null ? t.rewards.levelUpBody(level) : ''}</Text>
          <View style={styles.button}>
            <Text style={styles.buttonText}>{t.rewards.levelUpButton}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,17,24,0.95)', alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg },
  plateWrap: { marginTop: space.sm },
  copy: { alignItems: 'center', gap: space.md, maxWidth: 320, alignSelf: 'stretch' },
  title: { fontFamily: font.signHeavy, fontSize: size.headline, letterSpacing: 2, color: color.enamel },
  rankSign: { alignSelf: 'stretch' },
  body: { fontFamily: font.body, fontSize: size.body, lineHeight: 23, color: color.enamelEdge, textAlign: 'center' },
  button: { marginTop: space.sm, backgroundColor: color.signRed, borderRadius: radius.control, paddingVertical: 14, paddingHorizontal: space.xxl },
  buttonText: { fontFamily: font.signHeavy, fontSize: 19, letterSpacing: 1, color: color.white },
});
