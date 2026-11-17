import Svg, { G, Path, Rect } from 'react-native-svg';
import { color } from '@/theme';

/**
 * A stylised take on the small coat of arms of Prague: a red shield with a
 * golden wall, three towers, an open gate with a raised portcullis and an
 * armoured arm holding a sword. Drawn for the game, not the official artwork.
 */
export function CoatOfArms({ size = 48 }: { size?: number }) {
  const w = size;
  const h = size * 1.2;
  const gold = color.gold;
  const deep = color.goldDeep;
  const red = color.signRed;
  const silver = '#E9EAEC';
  return (
    <Svg width={w} height={h} viewBox="0 0 100 120" accessibilityLabel="Znak Prahy">
      <Path d="M4 4 H96 V60 C96 92 72 110 50 117 C28 110 4 92 4 60 Z" fill={red} stroke={gold} strokeWidth={4} />
      <G fill={gold} stroke={deep} strokeWidth={1.2}>
        {/* towers */}
        <Rect x={17} y={36} width={17} height={30} />
        <Rect x={66} y={36} width={17} height={30} />
        <Rect x={39} y={26} width={22} height={40} />
        {/* roofs */}
        <Path d="M15 37 L25.5 18 L36 37 Z" />
        <Path d="M64 37 L74.5 18 L85 37 Z" />
        <Path d="M37 27 L50 6 L63 27 Z" />
        {/* wall with battlements */}
        <Path d="M13 62 H87 V100 H13 Z" />
        <Path d="M13 62 V56 H19 V62 M25 62 V56 H31 V62 M37 62 V56 H43 V62 M57 62 V56 H63 V62 M69 62 V56 H75 V62 M81 62 V56 H87 V62" />
      </G>
      {/* windows */}
      <G fill={red}>
        <Rect x={23.5} y={44} width={4} height={7} rx={2} />
        <Rect x={72.5} y={44} width={4} height={7} rx={2} />
        <Rect x={47.5} y={34} width={5} height={9} rx={2.5} />
      </G>
      {/* stone courses */}
      <G stroke={deep} strokeWidth={1}>
        <Path d="M13 75 H38 M62 75 H87 M13 88 H38 M62 88 H87" />
      </G>
      {/* open gate */}
      <Path d="M37 100 V80 Q50 64 63 80 V100 Z" fill={color.signRedDeep} />
      {/* raised portcullis */}
      <G stroke={gold} strokeWidth={1.6}>
        <Path d="M41 76 V82 M45.5 71.5 V82 M50 70 V82 M54.5 71.5 V82 M59 76 V82 M40 80 H60" />
      </G>
      {/* armoured arm with sword */}
      <Rect x={49} y={81} width={2.4} height={15} fill={silver} />
      <Rect x={45.5} y={93} width={9.5} height={2.4} fill={silver} />
      <Path d="M37 98 Q42 94 49 95.5 L49 99 Q42 99 37 100 Z" fill={silver} />
    </Svg>
  );
}
