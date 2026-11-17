import { ScrollView, StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, frame, radius, size, space } from '@/theme';
import { CoatOfArms } from './coat-of-arms';
import { StreetSign } from './street-sign';

/** Header of a non-map screen: the coat of arms beside a street sign with the screen name. */
export function ScreenHeader({ title, district = 'Praha Quest' }: { title: string; district?: string }) {
  return (
    <View style={styles.header}>
      <CoatOfArms size={44} />
      <StreetSign district={district} name={title} size="lg" style={{ flex: 1 }} />
    </View>
  );
}

/** Scrolling page on a plaster wall, with the street-sign header. */
export function Screen({ title, children, ...rest }: { title: string; children: React.ReactNode } & ScrollViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      <ScreenHeader title={title} />
      {children}
    </ScrollView>
  );
}

/** A section title: red condensed caps with a rule, like the district line on a sign. */
export function SectionTitle({ children, hint }: { children: string; hint?: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionText}>{children.toLocaleUpperCase('cs')}</Text>
        <View style={styles.rule} />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Enamel panel with a thin frame in the given colour. */
export function Plate({ children, tone = color.enamelEdge, style }: { children: React.ReactNode; tone?: string; style?: object }) {
  return <View style={[styles.plate, { borderColor: tone }, style]}>{children}</View>;
}

export const screenStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.plaster },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg },
});

const styles = StyleSheet.create({
  ...screenStyles,
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  section: { gap: 4, marginTop: space.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sectionText: { fontFamily: font.signHeavy, fontSize: 20, letterSpacing: 1, color: color.signRed },
  rule: { flex: 1, height: 2, backgroundColor: color.signRed, opacity: 0.35 },
  hint: { fontFamily: font.body, fontSize: size.small, lineHeight: 20, color: color.inkSoft },
  plate: {
    backgroundColor: color.enamel,
    borderWidth: 2,
    borderRadius: radius.plate,
    padding: space.md,
    gap: space.sm,
  },
});

export { frame };
