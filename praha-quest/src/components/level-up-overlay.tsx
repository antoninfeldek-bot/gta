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
import { t } from '@/i18n';
import { useFeedStore } from '@/store/feed-store';
import { color, font, radius, size, space } from '@/theme';
import { HexShape } from './hex-shape';

/**
 * The one orchestrated moment in the game: the level seal rises out of the
 * fog, rings once and settles. Everything else stays calm.
 */
export function LevelUpOverlay() {
  const level = useFeedStore((s) => s.levelUp);
  const dismiss = useFeedStore((s) => s.dismissLevelUp);
  const reduced = useReducedMotion();
  const scale = useSharedValue(0.4);
  const ring = useSharedValue(0);
  const text = useSharedValue(0);

  useEffect(() => {
    if (level == null) return;
    if (reduced) {
      scale.value = 1;
      ring.value = 1;
      text.value = 1;
      return;
    }
    scale.value = 0.4;
    ring.value = 0;
    text.value = 0;
    scale.value = withSequence(withSpring(1.12, { damping: 9, stiffness: 140 }), withSpring(1, { damping: 14 }));
    ring.value = withDelay(180, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    text.value = withDelay(380, withTiming(1, { duration: 420 }));
  }, [level, reduced, ring, scale, text]);

  const sealStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: 1 - ring.value, transform: [{ scale: 1 + ring.value * 1.4 }] }));
  const textStyle = useAnimatedStyle(() => ({ opacity: text.value, transform: [{ translateY: (1 - text.value) * 12 }] }));

  return (
    <Modal visible={level != null} transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={dismiss} accessibilityRole="button">
        <View style={styles.stage}>
          <Animated.View style={[styles.ring, ringStyle]}>
            <HexShape size={150} fill="rgba(226,177,77,0.35)" />
          </Animated.View>
          <Animated.View style={sealStyle}>
            <HexShape size={150} fill={color.night} stroke={color.gilt} strokeWidth={4} />
            <View style={[StyleSheet.absoluteFill, styles.center]}>
              <Text style={styles.number}>{level}</Text>
            </View>
          </Animated.View>
        </View>
        <Animated.View style={[styles.copy, textStyle]}>
          <Text style={styles.title}>{t.rewards.levelUp}</Text>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(9,16,22,0.94)', alignItems: 'center', justifyContent: 'center', padding: space.xl },
  stage: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  number: { fontFamily: font.displayBlack, fontSize: 64, color: color.gilt },
  copy: { alignItems: 'center', marginTop: space.xxl, gap: space.sm, maxWidth: 320 },
  title: { fontFamily: font.display, fontSize: size.headline, color: color.parchment },
  body: { fontFamily: font.body, fontSize: size.body, lineHeight: 23, color: color.parchmentDim, textAlign: 'center' },
  button: {
    marginTop: space.lg,
    backgroundColor: color.gilt,
    borderRadius: radius.chip,
    paddingVertical: space.md,
    paddingHorizontal: space.xxl,
  },
  buttonText: { fontFamily: font.bodyBold, fontSize: size.body, color: color.ink },
});
