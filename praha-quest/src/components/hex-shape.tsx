import { StyleSheet, View } from 'react-native';

interface Props {
  size: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

/**
 * A pointy-top hexagon built from three rotated rectangles, so it needs no SVG
 * library (Expo Go friendly). The stroke is a slightly larger hex behind.
 */
export function HexShape({ size, fill, stroke, strokeWidth = 0 }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      {stroke && strokeWidth > 0 ? <Hex size={size} color={stroke} /> : null}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Hex size={size - strokeWidth * 2.3} color={fill} />
      </View>
    </View>
  );
}

function Hex({ size, color }: { size: number; color: string }) {
  // Pointy-top hex of height `size`: width = size * √3/2, side = size / 2.
  const width = (size * Math.sqrt(3)) / 2;
  const bar = { position: 'absolute' as const, width, height: size / 2, backgroundColor: color, top: size / 4, left: (size - width) / 2 };
  return (
    <View style={{ width: size, height: size }}>
      <View style={bar} />
      <View style={[bar, { transform: [{ rotate: '60deg' }] }]} />
      <View style={[bar, { transform: [{ rotate: '-60deg' }] }]} />
    </View>
  );
}
