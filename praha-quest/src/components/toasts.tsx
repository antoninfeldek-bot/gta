import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFeedStore, type Toast } from '@/store/feed-store';
import { color, font, radius, rarityColor, size, space } from '@/theme';

const ACCENT: Record<Toast['tone'], string> = {
  xp: color.gilt,
  place: color.gilt,
  item: '#B98AE6',
  set: color.patina,
  warn: color.danger,
};

/** Reward toasts, stacked under the HUD. */
export function Toasts() {
  const toasts = useFeedStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  return (
    <View style={[styles.wrap, { top: insets.top + 96 }]} pointerEvents="none">
      {toasts.map((toast) => (
        <Animated.View
          key={toast.id}
          entering={reduced ? undefined : FadeInUp.springify().damping(16)}
          exiting={reduced ? undefined : FadeOut.duration(220)}
          layout={reduced ? undefined : LinearTransition.springify().damping(18)}
          style={[styles.toast, { borderLeftColor: toast.rarity ? rarityColor[toast.rarity] : ACCENT[toast.tone] }]}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.title} numberOfLines={1}>
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
    alignItems: 'baseline',
    gap: space.sm,
    maxWidth: '100%',
    backgroundColor: color.slate,
    borderRadius: radius.control,
    borderLeftWidth: 3,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  title: { flexShrink: 1, fontFamily: font.bodyMedium, fontSize: size.small, color: color.parchment },
  detail: { fontFamily: font.bodyBold, fontSize: size.small, fontVariant: ['tabular-nums'] },
});
