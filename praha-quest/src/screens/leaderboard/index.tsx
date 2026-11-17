import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Plate, Screen, SectionTitle } from '@/components/screen';
import { districtProgress, weeklyLeaderboard } from '@/game';
import { formatNumber, t, tc } from '@/i18n';
import { engine, useGameStore } from '@/store/game-store';
import { color, font, radius, size, space } from '@/theme';

const AMBER = '#FFB21A';
const AMBER_DIM = '#8A6414';

export function LeaderboardScreen() {
  const game = useGameStore((s) => s.game);
  // Rivals keep walking while the screen is open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const rows = weeklyLeaderboard(game, now);
  const youIndex = rows.findIndex((r) => r.kind === 'you');
  const ahead = youIndex > 0 ? rows[youIndex - 1] : null;
  const you = rows[youIndex];
  const districts = districtProgress(engine.catalog, game);

  return (
    <Screen title={t.leaderboard.title}>
      <SectionTitle hint={t.leaderboard.weekHint}>{t.leaderboard.weekTitle}</SectionTitle>

      {/* Styled like a Prague public-transport departure board. */}
      <View style={styles.board} accessibilityRole="list">
        {rows.map((row) => {
          const isYou = row.kind === 'you';
          const name = isYou ? t.leaderboard.you : tc.rivals[row.id]?.name ?? row.id;
          return (
            <View key={row.id} style={[styles.row, isYou && styles.rowYou]}>
              <Text style={[styles.rank, isYou && styles.youText]}>{row.rank}.</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.name, isYou && styles.youText]} numberOfLines={1}>
                  {name.toLocaleUpperCase('cs')}
                </Text>
                {!isYou ? (
                  <Text style={styles.motto} numberOfLines={1}>
                    {tc.rivals[row.id]?.motto}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.xp, isYou && styles.youText]}>{formatNumber(row.xp)}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.verdict}>
        {ahead && you ? t.leaderboard.behind(ahead.xp - you.xp + 1, tc.rivals[ahead.id]?.name ?? '') : t.leaderboard.leading}
      </Text>

      <SectionTitle hint={t.leaderboard.districtsHint}>{t.leaderboard.districtsTitle}</SectionTitle>
      {districts.length === 0 ? <Text style={styles.verdict}>{t.leaderboard.districtsEmpty}</Text> : null}
      <View style={styles.districts}>
        {districts.map((d) => {
          const ratio = d.found / d.total;
          return (
            <Plate key={d.district} tone={ratio === 1 ? color.patina : color.signRed} style={styles.district}>
              <Text style={styles.districtName}>{d.district.toLocaleUpperCase('cs')}</Text>
              <Text style={styles.districtCount}>
                {d.found}/{d.total}
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${ratio * 100}%` }, ratio === 1 && { backgroundColor: color.patina }]} />
              </View>
            </Plate>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: '#0B0B0A',
    borderRadius: radius.panel,
    borderWidth: 3,
    borderColor: '#2B2B28',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2B2B28',
  },
  rowYou: { backgroundColor: '#1F1A0C', marginHorizontal: -space.md, paddingHorizontal: space.md },
  rank: { width: 26, fontFamily: font.signHeavy, fontSize: 20, color: AMBER, fontVariant: ['tabular-nums'] },
  name: { fontFamily: font.signHeavy, fontSize: 19, letterSpacing: 1, color: AMBER },
  motto: { fontFamily: font.body, fontSize: 12, color: AMBER_DIM },
  xp: { fontFamily: font.signHeavy, fontSize: 20, color: AMBER, fontVariant: ['tabular-nums'] },
  youText: { color: '#FFFFFF' },
  verdict: { fontFamily: font.bodyMedium, fontSize: size.small, color: color.inkSoft },
  districts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  district: { flexBasis: '47%', flexGrow: 1, gap: 4 },
  districtName: { fontFamily: font.signHeavy, fontSize: 18, letterSpacing: 0.6, color: color.ink },
  districtCount: { fontFamily: font.sign, fontSize: 15, color: color.inkSoft },
  track: { height: 5, borderRadius: 3, backgroundColor: color.enamelShade, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.signRed },
});
