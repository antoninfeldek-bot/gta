import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GAME_CONFIG, type Place, type PlaceSet } from '@/game';
import { t } from '@/i18n';
import { engine, useGameStore } from '@/store/game-store';
import { color, font, radius, rarityColor, size, space } from '@/theme';

type Filter = 'all' | 'found' | 'missing';
const RANK = { legendary: 0, epic: 1, rare: 2, common: 3 } as const;

export function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const visited = useGameStore((s) => s.game.places);
  const completed = useGameStore((s) => s.game.completedSets);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const places = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('cs');
    return engine.catalog.places
      .filter((p) => (filter === 'found' ? visited[p.id] : filter === 'missing' ? !visited[p.id] : true))
      .filter((p) => !q || p.nameCs.toLocaleLowerCase('cs').includes(q))
      .sort((a, b) => RANK[a.rarity] - RANK[b.rarity] || a.nameCs.localeCompare(b.nameCs, 'cs'));
  }, [filter, query, visited]);

  const header = (
    <View style={{ gap: space.lg }}>
      <Text style={styles.h1}>{t.collection.title}</Text>
      <Text style={styles.h2}>{t.collection.setsTitle}</Text>
      <View style={{ gap: space.sm }}>
        {engine.catalog.sets.map((set) => (
          <SetRow key={set.id} set={set} visited={visited} done={completed[set.id] != null} />
        ))}
      </View>
      <Text style={[styles.h2, { marginTop: space.md }]}>{t.collection.placesTitle}</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t.collection.search}
        placeholderTextColor={color.parchmentDim}
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
    </View>
  );

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: space.xxl, paddingHorizontal: space.lg }}
      data={places}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>{engine.catalog.places.length ? t.collection.empty : t.collection.noData}</Text>}
      renderItem={({ item }) => <PlaceRow place={item} visits={visited[item.id]?.visits ?? 0} />}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      initialNumToRender={20}
      keyboardShouldPersistTaps="handled"
    />
  );
}

function SetRow({ set, visited, done }: { set: PlaceSet; visited: Record<string, unknown>; done: boolean }) {
  const have = set.placeIds.filter((id) => visited[id]).length;
  const total = set.placeIds.length;
  const reward = GAME_CONFIG.sets.baseXp + GAME_CONFIG.sets.perPlaceXp * total;
  return (
    <View style={[styles.set, done && styles.setDone]}>
      <View style={styles.setTop}>
        <Text style={styles.setName}>{set.nameCs}</Text>
        <Text style={[styles.setCount, done && { color: color.patina }]}>
          {done ? t.collection.setDone : t.collection.setProgress(have, total)}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(have / total) * 100}%` }, done && { backgroundColor: color.patina }]} />
      </View>
      {!done ? <Text style={styles.setReward}>{t.collection.setReward(reward)}</Text> : null}
    </View>
  );
}

function PlaceRow({ place, visits }: { place: Place; visits: number }) {
  const tint = rarityColor[place.rarity];
  const found = visits > 0;
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { borderColor: tint, backgroundColor: found ? tint : 'transparent' }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowName, !found && { color: color.parchmentDim }]} numberOfLines={1}>
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
  root: { flex: 1, backgroundColor: color.night },
  h1: { fontFamily: font.display, fontSize: size.hero, color: color.parchment, lineHeight: 50 },
  h2: { fontFamily: font.display, fontSize: size.title, color: color.parchment },
  set: { backgroundColor: color.slate, borderRadius: radius.panel, padding: space.lg, gap: space.sm },
  setDone: { borderWidth: 1, borderColor: color.patina },
  setTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md },
  setName: { flex: 1, fontFamily: font.bodyBold, fontSize: size.body, color: color.parchment },
  setCount: { fontFamily: font.bodyMedium, fontSize: size.small, color: color.gilt, fontVariant: ['tabular-nums'] },
  setReward: { fontFamily: font.body, fontSize: size.caption, color: color.parchmentDim },
  track: { height: 4, borderRadius: 2, backgroundColor: color.slateHigh, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.gilt },
  search: {
    backgroundColor: color.slate,
    borderRadius: radius.control,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontFamily: font.body,
    fontSize: size.body,
    color: color.parchment,
  },
  filters: { flexDirection: 'row', gap: space.sm, marginBottom: space.sm },
  chip: { borderRadius: radius.chip, paddingVertical: 7, paddingHorizontal: space.lg, backgroundColor: color.slate },
  chipOn: { backgroundColor: color.gilt },
  chipText: { fontFamily: font.bodyMedium, fontSize: size.small, color: color.parchment },
  chipTextOn: { color: color.ink, fontFamily: font.bodyBold },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  rowName: { fontFamily: font.bodyMedium, fontSize: size.body, color: color.parchment },
  rowMeta: { fontFamily: font.body, fontSize: size.caption, color: color.parchmentDim, marginTop: 2 },
  rowRarity: { fontFamily: font.bodyMedium, fontSize: size.caption },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: color.slateHigh },
  empty: { fontFamily: font.body, fontSize: size.body, color: color.parchmentDim, paddingVertical: space.xl },
});
