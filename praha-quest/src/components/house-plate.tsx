import { StyleSheet, Text, View } from 'react-native';
import { color, font } from '@/theme';

interface Props {
  value: string | number;
  /** Blue = orientační číslo, red = číslo popisné. */
  tone?: 'blue' | 'red';
  size?: number;
  caption?: string;
}

/** A Prague house-number plate: enamel with a white inset line and white numerals. */
export function HousePlate({ value, tone = 'blue', size = 52, caption }: Props) {
  const bg = tone === 'blue' ? color.plateBlue : color.signRed;
  const text = String(value);
  const digits = text.length;
  return (
    <View style={[styles.plate, { backgroundColor: bg, minWidth: size * 0.95, height: size }]}>
      <View style={styles.inset}>
        <Text style={[styles.value, { fontSize: size * (digits > 2 ? 0.48 : 0.58) }]} numberOfLines={1}>
          {text}
        </Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { borderRadius: 6, padding: 3 },
  inset: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: color.white,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  value: { fontFamily: font.signHeavy, color: color.white, includeFontPadding: false },
  caption: { fontFamily: font.signMedium, fontSize: 9, letterSpacing: 1, color: color.white, marginTop: -2 },
});
