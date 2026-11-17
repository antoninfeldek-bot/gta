import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import type { Place } from '@/game';
import { font } from '@/theme';
import { PLACE_GLYPH } from '@/utils/places';
import { markerLook } from './marker-style';

interface Props {
  place: Place;
  discovered: boolean;
  /** Inside explored land: show what it is. In fog: a "?" plate. */
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

  const look = markerLook(place, discovered, visible);
  return (
    <Marker
      coordinate={{ latitude: place.lat, longitude: place.lng }}
      tracksViewChanges={tracks}
      onPress={() => onPress(place.id)}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={look.big ? 20 : 10}
    >
      <View
        style={[
          styles.plate,
          { width: look.sizePx, height: look.sizePx, backgroundColor: look.bg, borderColor: look.border },
        ]}
      >
        <Text style={[styles.glyph, { color: look.fg, fontSize: look.big ? 18 : 15 }]}>
          {visible || discovered ? PLACE_GLYPH[place.type] : '?'}
        </Text>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  plate: { borderRadius: 6, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontFamily: font.signHeavy, textAlign: 'center', includeFontPadding: false },
});
