import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Plate, Screen, SectionTitle } from '@/components/screen';
import { GAME_CONFIG, type Place } from '@/game';
import { t, tc } from '@/i18n';
import { engine, useGameStore } from '@/store/game-store';
import { color, font, radius, rarityColor, size, space } from '@/theme';
import { PLACE_GLYPH } from '@/utils/places';

type Filter = 'all' | 'found' | 'missing';
const RANK = { legendary: 0, epic: 1, rare: 2, common: 3 } as const;

/** Which place unlocks each dish, for the locked cookbook cards. */
const DISH_SOURCES = new Map(engine.catalog.places.filter((p) => p.dish).map((p) => [p.dish as string, p]));

export function CollectionScreen() {
  const visited = useGameStore((s) => s.game.places);
  const completed = useGameStore((s) => s.game.completedSets);
  const dishes = useGameStore((s) => s.game.dishes);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const places = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('cs');
    return engine.catalog.places
      .filter((p) => (filter === 'found' ? visited[p.id] : filter === 'missing' ? !visited[p.id] : true))
      .filter((p) => !q || p.nameCs.toLocaleLowerCase('cs').includes(q))
      .sort((a, b) => RANK[a.rarity] - RANK[b.rarity] || a.nameCs.localeCompare(b.nameCs, 'cs'));
  }, [filter, query, visited]);

  const dishIds = [...DISH_SOURCES.keys()].filter((id) => tc.dishes[id]);
  const unlocked = dishIds.filter((id) => dishes[id]).length;

  return (
    <Screen title={t.collection.title}>
      <SectionTitle hint={`${t.cookbook.hint} ${t.cookbook.count(unlocked, dishIds.length)}.`}>{t.cookbook.title}</SectionTitle>
      <View style={styles.dishGrid}>
        {dishIds.map((id) => {
          const dish = tc.dishes[id];
          const open = dishes[id] != null;
          const source = DISH_SOURCES.get(id);
          return (
            <View key={id} style={[styles.dish, open ? styles.dishOpen : styles.dishLocked]}>
              <Text style={[styles.dishName, !open && { color: color.inkMute }]}>{dish.name.toLocaleUpperCase('cs')}</Text>
              <Text style={styles.dishText} numberOfLines={3}>
                {open ? dish.tip : source ? t.cookbook.unlockAt(source.nameCs) : t.cookbook.locked}
              </Text>
            </View>
          );
        })}
      </View>

      <SectionTitle>{t.collection.setsTitle}</SectionTitle>
      {engine.catalog.sets.map((set) => {
        const have = set.placeIds.filter((id) => visited[id]).length;
        const total = set.placeIds.length;
        const done = completed[set.id] != null;
        return (
          <Plate key={set.id} tone={done ? color.patina : color.enamelEdge}>
            <View style={styles.setTop}>
              <Text style={styles.setName}>{set.nameCs}</Text>
              <Text style={[styles.setCount, done && { color: color.patina }]}>
                {done ? t.collection.setDone : t.collection.setProgress(have, total)}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(have / total) * 100}%` }, done && { backgroundColor: color.patina }]} />
            </View>
            {!done ? (
              <Text style={styles.small}>{t.collection.setReward(GAME_CONFIG.sets.baseXp + GAME_CONFIG.sets.perPlaceXp * total)}</Text>
            ) : null}
          </Plate>
        );
      })}

      <SectionTitle>{t.collection.placesTitle}</SectionTitle>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t.collection.search}
        placeholderTextColor={color.inkMute}
        style={styles.search}
        autoCorrect={false}
      />
      <View style={styles.filters}>
        {(['all', 'found', 'missing'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextOn]}>
              {f === 'all' ? t.collection.filterAll : f === 'found' ? t.collection.filterFound : t.collection.filterMissing}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.list}>
        {places.length === 0 ? <Text style={styles.small}>{t.collection.empty}</Text> : null}
        {places.map((p, i) => (
          <PlaceRow key={p.id} place={p} visits={visited[p.id]?.visits ?? 0} last={i === places.length - 1} />
        ))}
      </View>
    </Screen>
  );
}

function PlaceRow({ place, visits, last }: { place: Place; visits: number; last: boolean }) {
  const tint = rarityColor[place.rarity];
  const found = visits > 0;
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.badge, { borderColor: tint, backgroundColor: found ? tint : color.enamel }]}>
        <Text style={[styles.badgeText, { color: found ? color.white : tint }]}>{PLACE_GLYPH[place.type]}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowName, !found && { color: color.inkSoft }]} numberOfLines={1}>
          {place.nameCs}
        </Text>
        <Text style={styles.rowMeta}>
          {t.placeType[place.type]}
          {place.district !== 'Praha' ? `, ${place.district}` : ''}
        </Text>
      </View>
      <Text style={[styles.rowRarity, { color: tint }]}>{found ? t.place.visits(visits) : t.rarity[place.rarity]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dishGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  dish: { flexBasis: '47%', flexGrow: 1, borderRadius: radius.plate, padding: space.md, gap: 4, borderWidth: 2 },
  dishOpen: { backgroundColor: color.enamel, borderColor: color.gold },
  dishLocked: { backgroundColor: color.plasterDeep, borderColor: color.plasterDeep },
  dishName: { fontFamily: font.signHeavy, fontSize: 17, letterSpacing: 0.4, color: color.ink },
  dishText: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.inkSoft },
  setTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md },
  setName: { flex: 1, fontFamily: font.signHeavy, fontSize: 19, letterSpacing: 0.3, color: color.ink },
  setCount: { fontFamily: font.signHeavy, fontSize: 17, color: color.signRed, fontVariant: ['tabular-nums'] },
  small: { fontFamily: font.body, fontSize: size.caption, color: color.inkMute },
  track: { height: 5, borderRadius: 3, backgroundColor: color.enamelShade, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.signRed },
  search: {
    backgroundColor: color.enamel,
    borderRadius: radius.control,
    borderWidth: 2,
    borderColor: color.enamelEdge,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontFamily: font.body,
    fontSize: size.body,
    color: color.ink,
  },
  filters: { flexDirection: 'row', gap: space.sm },
  chip: { borderRadius: radius.chip, paddingVertical: 6, paddingHorizontal: space.lg, backgroundColor: color.enamel, borderWidth: 2, borderColor: color.enamelEdge },
  chipOn: { backgroundColor: color.signRed, borderColor: color.signRed },
  chipText: { fontFamily: font.sign, fontSize: 16, color: color.ink },
  chipTextOn: { color: color.white },
  list: { backgroundColor: color.enamel, borderRadius: radius.plate, paddingHorizontal: space.md, borderWidth: 2, borderColor: color.enamelEdge },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.enamelEdge },
  badge: { width: 28, height: 28, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: font.signHeavy, fontSize: 15, includeFontPadding: false },
  rowName: { fontFamily: font.bodyMedium, fontSize: size.body, color: color.ink },
  rowMeta: { fontFamily: font.body, fontSize: size.caption, color: color.inkMute, marginTop: 1 },
  rowRarity: { fontFamily: font.sign, fontSize: 14 },
});
