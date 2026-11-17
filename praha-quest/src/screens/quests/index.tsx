import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HousePlate } from '@/components/house-plate';
import { Plate, Screen, SectionTitle } from '@/components/screen';
import { dailyQuestProgress, dailyQuests, gameDay, type DailyQuest } from '@/game';
import { formatNumber, t, tc } from '@/i18n';
import { engine, useGameStore } from '@/store/game-store';
import { color, font, radius, size, space } from '@/theme';

const TIER_TONE = [color.patina, color.plateBlue, color.signRed] as const;

function questTitle(q: DailyQuest): string {
  if (q.kind === 'checkInType' && q.placeType) return tc.dailyQuestTitle.checkInType[q.placeType]?.(q.target) ?? '';
  if (q.kind === 'checkInType') return '';
  return tc.dailyQuestTitle[q.kind](q.target);
}

export function QuestsScreen() {
  const game = useGameStore((s) => s.game);
  // Show today's quests even before the first event of the day rolls the counters.
  const today = gameDay(Date.now());
  const isToday = game.daily.day === today;
  const quests = useMemo(() => dailyQuests(game.playerSeed, today), [game.playerSeed, today]);
  const streak = game.streak.lastDay ? game.streak.count : 0;

  return (
    <Screen title={t.quests.title}>
      <SectionTitle hint={t.quests.dailyHint}>{t.quests.dailyTitle}</SectionTitle>
      <View style={styles.streakRow}>
        <HousePlate value={streak} tone="red" size={46} />
        <View style={{ flex: 1 }}>
          <Text style={styles.streakTitle}>{t.quests.streak(streak)}</Text>
          <Text style={styles.hint}>{t.quests.allDoneBonus}</Text>
        </View>
      </View>
      {quests.map((q) => {
        const progress = isToday ? dailyQuestProgress(game, q) : 0;
        const done = isToday && game.daily.questsDone.includes(q.id);
        const ratio = Math.min(1, progress / q.target);
        return (
          <Plate key={q.id} tone={done ? color.patina : TIER_TONE[q.tier]}>
            <View style={styles.questTop}>
              <Text style={styles.questTitle}>{questTitle(q)}</Text>
              <Text style={[styles.count, done && { color: color.patina }]}>
                {done ? t.quests.done : `${formatNumber(Math.min(progress, q.target))}/${formatNumber(q.target)}`}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: done ? color.patina : TIER_TONE[q.tier] }]} />
            </View>
            <Text style={styles.reward}>{t.quests.reward(q.xp, q.coins)}</Text>
          </Plate>
        );
      })}

      <SectionTitle hint={t.quests.storyHint}>{t.quests.storyTitle}</SectionTitle>
      {engine.storyQuests.map((q) => {
        const text = tc.storyQuests[q.id];
        const p = game.story[q.id];
        const step = p?.step ?? 0;
        const done = p?.completedAt != null;
        const next = done ? null : engine.placeById.get(q.stepPlaceIds[step]);
        return (
          <Plate key={q.id} tone={done ? color.patina : color.plateBlue}>
            <View style={styles.questTop}>
              <Text style={styles.storyTitle}>{text.title.toLocaleUpperCase('cs')}</Text>
              <Text style={[styles.count, { color: done ? color.patina : color.plateBlue }]}>
                {done ? t.quests.storyDone : `${step}/${q.stepPlaceIds.length}`}
              </Text>
            </View>
            <Text style={styles.body}>{done ? text.done : step === 0 ? text.intro : text.steps[step]}</Text>
            <View style={styles.stops}>
              {q.stepPlaceIds.map((id, i) => {
                const reached = i < step || done;
                const current = !done && i === step;
                return (
                  <View
                    key={id + i}
                    style={[
                      styles.stop,
                      reached && { backgroundColor: color.plateBlue, borderColor: color.plateBlue },
                      current && { borderColor: color.signRed },
                    ]}
                  >
                    <Text style={[styles.stopText, reached && { color: color.white }]} numberOfLines={1}>
                      {engine.placeById.get(id)?.nameCs ?? ''}
                    </Text>
                  </View>
                );
              })}
            </View>
            {next ? (
              <Text style={styles.next}>
                {step === 0 ? t.quests.storyStart : t.quests.storyNext}: {next.nameCs}
              </Text>
            ) : null}
            <Text style={styles.reward}>{t.quests.reward(q.xp, q.coins)}</Text>
          </Plate>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  streakTitle: { fontFamily: font.signHeavy, fontSize: 20, color: color.ink },
  hint: { fontFamily: font.body, fontSize: size.small, lineHeight: 19, color: color.inkSoft },
  questTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md },
  questTitle: { flex: 1, fontFamily: font.bodyBold, fontSize: size.body, color: color.ink },
  storyTitle: { flex: 1, fontFamily: font.signHeavy, fontSize: 20, letterSpacing: 0.5, color: color.ink },
  count: { fontFamily: font.signHeavy, fontSize: 18, color: color.inkSoft, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, backgroundColor: color.enamelShade, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  reward: { fontFamily: font.bodyMedium, fontSize: size.caption, color: color.inkMute },
  body: { fontFamily: font.body, fontSize: size.small, lineHeight: 20, color: color.inkSoft },
  stops: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stop: {
    borderWidth: 1.5,
    borderColor: color.enamelEdge,
    borderRadius: radius.chip,
    paddingHorizontal: 9,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  stopText: { fontFamily: font.sign, fontSize: 14, color: color.inkSoft },
  next: { fontFamily: font.bodyBold, fontSize: size.small, color: color.signRed },
});
