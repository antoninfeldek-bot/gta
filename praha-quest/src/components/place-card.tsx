import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GAME_CONFIG, type Place } from '@/game';
import { fmtDistance, t } from '@/i18n';
import { engine, useGameStore } from '@/store/game-store';
import { useFeedStore } from '@/store/feed-store';
import { color, font, radius, rarityColor, size, space } from '@/theme';

interface Props {
  place: Place;
  distance: number | null;
  onClose?: () => void;
}

const timeFmt = new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit' });

/** The bottom card for one place: what it is, how far, and the claim action. */
export function PlaceCard({ place, distance, onClose }: Props) {
  const progress = useGameStore((s) => s.game.places[place.id]);
  const lastFix = useGameStore((s) => s.game.lastFix);
  const dispatch = useGameStore((s) => s.dispatch);
  const tint = rarityColor[place.rarity];
  const eligibility = engine.canCheckIn(useGameStore.getState().game, place.id, Date.now());
  const sets = engine.setsByPlace.get(place.id) ?? [];

  let action: { label: string; enabled: boolean };
  if (eligibility.ok) action = { label: progress ? t.place.claimAgain : t.place.claim, enabled: true };
  else if (eligibility.reason === 'cooldown') action = { label: t.place.cooldown(timeFmt.format(eligibility.readyAt)), enabled: false };
  else if (eligibility.reason === 'tooFar') action = { label: t.place.walkCloser(Math.max(5, eligibility.distance - GAME_CONFIG.places.checkInRadiusM)), enabled: false };
  else action = { label: t.checkInFailure[eligibility.reason], enabled: false };

  const claim = () => {
    const result = dispatch({ type: 'checkIn', placeId: place.id });
    if (result.checkInFailure) useFeedStore.getState().push({ tone: 'warn', title: t.checkInFailure[result.checkInFailure] });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.meta}>
            {t.placeType[place.type]}
            {'  '}
            <Text style={{ color: tint }}>{t.rarity[place.rarity]}</Text>
          </Text>
          <Text style={styles.name} numberOfLines={2}>
            {place.nameCs}
          </Text>
          <Text style={styles.sub}>
            {[place.district !== 'Praha' ? place.district : null, distance != null && lastFix ? fmtDistance(distance) : null]
              .filter(Boolean)
              .join(', ')}
          </Text>
        </View>
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Zavřít">
            <Text style={styles.close}>×</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.status}>
        {progress
          ? `${t.place.discovered}, ${t.place.visits(progress.visits)}`
          : t.place.rewardPreview(GAME_CONFIG.places.discoverXp[place.rarity])}
        {sets.length > 0 ? `\n${sets.map((s) => s.nameCs).join(', ')}` : ''}
      </Text>

      <Pressable
        onPress={claim}
        disabled={!action.enabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !action.enabled }}
        style={({ pressed }) => [styles.button, !action.enabled && styles.buttonOff, pressed && styles.buttonPressed]}
      >
        <Text style={[styles.buttonText, !action.enabled && styles.buttonTextOff]}>{action.label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.slate,
    borderRadius: radius.sheet,
    padding: space.lg,
    gap: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.slateHigh,
  },
  header: { flexDirection: 'row', gap: space.md },
  meta: { fontFamily: font.bodyBold, fontSize: size.caption, color: color.parchmentDim },
  name: { fontFamily: font.display, fontSize: size.title, lineHeight: 26, color: color.parchment },
  sub: { fontFamily: font.body, fontSize: size.small, color: color.parchmentDim },
  close: { fontFamily: font.body, fontSize: 28, lineHeight: 28, color: color.parchmentDim },
  status: { fontFamily: font.body, fontSize: size.small, lineHeight: 20, color: color.parchmentDim },
  button: { backgroundColor: color.gilt, borderRadius: radius.control, paddingVertical: 14, alignItems: 'center' },
  buttonOff: { backgroundColor: color.slateHigh },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  buttonText: { fontFamily: font.bodyBold, fontSize: size.body, color: color.ink },
  buttonTextOff: { color: color.parchmentDim, fontFamily: font.bodyMedium },
});
