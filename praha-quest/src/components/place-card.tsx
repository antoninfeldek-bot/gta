import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GAME_CONFIG, type Place } from '@/game';
import { fmtDistance, t, tc } from '@/i18n';
import { engine, useGameStore } from '@/store/game-store';
import { useFeedStore } from '@/store/feed-store';
import { color, font, frame, radius, rarityColor, size, space } from '@/theme';

interface Props {
  place: Place;
  distance: number | null;
  onClose?: () => void;
}

const timeFmt = new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit' });

/** The bottom card for one place, built like a Prague street sign. */
export function PlaceCard({ place, distance, onClose }: Props) {
  const progress = useGameStore((s) => s.game.places[place.id]);
  const lastFix = useGameStore((s) => s.game.lastFix);
  const story = useGameStore((s) => s.game.story);
  const dispatch = useGameStore((s) => s.dispatch);
  const tint = rarityColor[place.rarity];
  const eligibility = engine.canCheckIn(useGameStore.getState().game, place.id, Date.now());

  let action: { label: string; enabled: boolean };
  if (eligibility.ok) action = { label: progress ? t.place.claimAgain : t.place.claim, enabled: true };
  else if (eligibility.reason === 'cooldown') action = { label: t.place.cooldown(timeFmt.format(eligibility.readyAt)), enabled: false };
  else if (eligibility.reason === 'tooFar')
    action = { label: t.place.walkCloser(Math.max(5, eligibility.distance - GAME_CONFIG.places.checkInRadiusM)), enabled: false };
  else action = { label: t.checkInFailure[eligibility.reason], enabled: false };

  const claim = () => {
    const result = dispatch({ type: 'checkIn', placeId: place.id });
    if (result.checkInFailure) useFeedStore.getState().push({ tone: 'warn', title: t.checkInFailure[result.checkInFailure] });
  };

  const dish = place.dish ? tc.dishes[place.dish] : undefined;
  const lore = tc.lore[place.nameCs];
  const quest = engine.storyQuests.find((q) => {
    const p = story[q.id];
    return p?.completedAt == null && q.stepPlaceIds[p?.step ?? 0] === place.id;
  });
  const questStep = quest ? (story[quest.id]?.step ?? 0) : 0;

  return (
    <View style={styles.sign}>
      <View style={styles.inner}>
        <View style={styles.districtRow}>
          <Text style={styles.district}>{(place.district !== 'Praha' ? place.district : 'Praha').toLocaleUpperCase('cs')}</Text>
          {onClose ? (
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Zavřít" style={styles.close}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {place.nameCs.toLocaleUpperCase('cs')}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{t.placeType[place.type]}</Text>
          <View style={[styles.rarity, { backgroundColor: tint }]}>
            <Text style={styles.rarityText}>{t.rarity[place.rarity]}</Text>
          </View>
          {distance != null && lastFix ? <Text style={styles.meta}>{fmtDistance(distance)}</Text> : null}
        </View>
      </View>

      <View style={styles.body}>
        {quest ? (
          <View style={styles.quest}>
            <Text style={styles.questTitle}>
              {tc.storyQuests[quest.id].title}, {t.quests.storyStep(questStep + 1, quest.stepPlaceIds.length).toLocaleLowerCase('cs')}
            </Text>
            <Text style={styles.text}>{tc.storyQuests[quest.id].steps[questStep]}</Text>
          </View>
        ) : null}
        {lore ? (
          <Text style={styles.text} numberOfLines={3}>
            {lore}
          </Text>
        ) : null}
        {dish ? (
          <Text style={styles.text}>
            <Text style={styles.tipLabel}>Tip: {dish.name}. </Text>
            {dish.tip}
          </Text>
        ) : null}
        <Text style={styles.status}>
          {progress
            ? `${t.place.discovered}, ${t.place.visits(progress.visits)}`
            : t.place.rewardPreview(GAME_CONFIG.places.discoverXp[place.rarity])}
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
    </View>
  );
}

const styles = StyleSheet.create({
  sign: {
    backgroundColor: color.enamel,
    borderColor: color.signRed,
    borderWidth: frame,
    borderRadius: radius.plate,
    padding: 3,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  inner: {
    borderColor: color.signRed,
    borderWidth: 1,
    borderRadius: radius.plate - 3,
    paddingHorizontal: space.md,
    paddingTop: space.xs,
    paddingBottom: space.sm,
    alignItems: 'center',
    gap: 2,
  },
  districtRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomColor: color.signRed,
    borderBottomWidth: 1,
    paddingBottom: 2,
  },
  district: { fontFamily: font.signMedium, fontSize: 12, letterSpacing: 1.5, color: color.signRed },
  close: { position: 'absolute', right: -4, top: -6 },
  closeText: { fontFamily: font.bodyBold, fontSize: 24, lineHeight: 26, color: color.signRed },
  name: { fontFamily: font.signHeavy, fontSize: 28, lineHeight: 30, color: color.ink, textAlign: 'center', letterSpacing: 0.4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap', justifyContent: 'center' },
  meta: { fontFamily: font.bodyMedium, fontSize: size.caption, color: color.inkSoft },
  rarity: { borderRadius: radius.chip, paddingHorizontal: 8, paddingVertical: 1 },
  rarityText: { fontFamily: font.sign, fontSize: 12, letterSpacing: 0.6, color: color.white },
  body: { paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.sm, gap: space.sm },
  quest: { borderLeftWidth: 3, borderLeftColor: color.plateBlue, paddingLeft: space.sm, gap: 2 },
  questTitle: { fontFamily: font.sign, fontSize: 15, letterSpacing: 0.4, color: color.plateBlue },
  text: { fontFamily: font.body, fontSize: size.small, lineHeight: 20, color: color.inkSoft },
  tipLabel: { fontFamily: font.bodyBold, color: color.goldDeep },
  status: { fontFamily: font.bodyMedium, fontSize: size.caption, color: color.inkMute },
  button: { backgroundColor: color.signRed, borderRadius: radius.control, paddingVertical: 13, alignItems: 'center' },
  buttonOff: { backgroundColor: color.enamelShade },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  buttonText: { fontFamily: font.signHeavy, fontSize: 19, letterSpacing: 0.8, color: color.white },
  buttonTextOff: { color: color.inkSoft, fontFamily: font.sign, fontSize: 17 },
});
