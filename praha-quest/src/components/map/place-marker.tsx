import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import type { Place } from '@/game';
import { color, font, rarityColor } from '@/theme';
import { HexShape } from '@/components/hex-shape';
import { PLACE_GLYPH } from '@/utils/places';

interface Props {
  place: Place;
  discovered: boolean;
  /** Inside explored land: show what it is. In fog: a silhouette. */
  visible: boolean;
  onPress: (id: string) => void;
}

export const PlaceMarker = memo(function PlaceMarker({ place, discovered, visible, onPress }: Props) {
  // Android needs one render pass with tracking on before it can snapshot the view.
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 400);
    return () => clearTimeout(id);
  }, [discovered, visible]);

  const tint = rarityColor[place.rarity];
  const big = place.rarity === 'legendary' || place.rarity === 'epic';
  const sizePx = big ? 38 : 30;
  return (
    <Marker
      coordinate={{ latitude: place.lat, longitude: place.lng }}
      tracksViewChanges={tracks}
      onPress={() => onPress(place.id)}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={big ? 20 : 10}
    >
      <View style={{ width: sizePx, height: sizePx, opacity: visible || discovered ? 1 : 0.7 }}>
        <HexShape size={sizePx} fill={discovered ? tint : color.night} stroke={tint} strokeWidth={2} />
        <View style={StyleSheet.absoluteFill}>
          <Text
            style={[
              styles.glyph,
              { lineHeight: sizePx, fontSize: big ? 17 : 14, color: discovered ? color.ink : tint },
              place.type === 'metro' && styles.metro,
            ]}
          >
            {visible || discovered ? PLACE_GLYPH[place.type] : '?'}
          </Text>
        </View>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  glyph: { textAlign: 'center', fontFamily: font.bodyBold },
  metro: { fontFamily: font.displayBlack },
});
