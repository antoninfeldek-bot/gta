import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFeedStore, type Toast } from '@/store/feed-store';
import { color, font, radius, rarityColor, size, space } from '@/theme';

const ACCENT: Record<Toast['tone'], string> = {
  xp: color.signRed,
  place: color.signRed,
  item: rarityColor.epic,
  set: color.patina,
  quest: color.plateBlue,
  food: color.goldDeep,
  warn: color.signRedDeep,
};

/** Reward toasts: small enamel plates under the HUD. */
export function Toasts() {
  const toasts = useFeedStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  return (
    <View style={[styles.wrap, { top: insets.top + 92 }]} pointerEvents="none">
      {toasts.map((toast) => (
        <Animated.View
          key={toast.id}
          entering={reduced ? undefined : FadeInUp.springify().damping(16)}
          exiting={reduced ? undefined : FadeOut.duration(220)}
          layout={reduced ? undefined : LinearTransition.springify().damping(18)}
          style={[styles.toast, { borderColor: toast.rarity ? rarityColor[toast.rarity] : ACCENT[toast.tone] }]}
          accessibilityLiveRegion="polite"
        >
          {toast.cheer ? <Text style={[styles.cheer, { color: ACCENT[toast.tone] }]}>{toast.cheer}</Text> : null}
          <Text style={styles.title} numberOfLines={2}>
            {toast.title}
          </Text>
          {toast.detail ? <Text style={[styles.detail, { color: ACCENT[toast.tone] }]}>{toast.detail}</Text> : null}
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center', gap: space.sm },
  toast: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: space.sm,
    maxWidth: '100%',
    backgroundColor: color.enamel,
    borderRadius: radius.plate,
    borderWidth: 2,
    paddingVertical: 7,
    paddingHorizontal: space.md,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cheer: { fontFamily: font.signHeavy, fontSize: 16, letterSpacing: 0.5 },
  title: { flexShrink: 1, fontFamily: font.bodyMedium, fontSize: size.small, color: color.ink },
  detail: { fontFamily: font.signHeavy, fontSize: 16, fontVariant: ['tabular-nums'] },
});
