import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, font, frame, radius, space } from '@/theme';

interface Props {
  /** Small line above the name, e.g. "Praha 1". */
  district?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  children?: React.ReactNode;
}

const NAME_SIZE = { sm: 18, md: 24, lg: 34 } as const;

/** A Prague enamel street-name plate: cream field, red frame, dark condensed lettering. */
export function StreetSign({ district, name, size = 'md', style, children }: Props) {
  return (
    <View style={[styles.plate, style]} accessibilityRole="header">
      <View style={styles.inner}>
        {district ? (
          <View style={styles.districtRow}>
            <Text style={styles.district}>{district.toLocaleUpperCase('cs')}</Text>
          </View>
        ) : null}
        <Text style={[styles.name, { fontSize: NAME_SIZE[size], lineHeight: NAME_SIZE[size] * 1.05 }]} numberOfLines={2}>
          {name.toLocaleUpperCase('cs')}
        </Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    backgroundColor: color.enamel,
    borderColor: color.signRed,
    borderWidth: frame,
    borderRadius: radius.plate,
    padding: 3,
  },
  inner: {
    borderColor: color.signRed,
    borderWidth: 1,
    borderRadius: radius.plate - 3,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: 2,
    alignItems: 'center',
  },
  districtRow: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderBottomColor: color.signRed,
    borderBottomWidth: 1,
    paddingBottom: 2,
    marginBottom: 2,
  },
  district: { fontFamily: font.signMedium, fontSize: 12, letterSpacing: 1.5, color: color.signRed },
  name: { fontFamily: font.signHeavy, color: color.ink, textAlign: 'center', letterSpacing: 0.5 },
});
