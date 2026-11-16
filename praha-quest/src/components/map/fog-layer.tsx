import { memo, useMemo } from 'react';
import { Polygon } from 'react-native-maps';
import { color } from '@/theme';
import { computeFog, quantizeRegion, type Region } from '@/utils/fog';

interface Props {
  region: Region;
  revealed: Record<string, number>;
}

/** Fog of war for the visible viewport: one polygon with explored land cut out. */
export const FogLayer = memo(function FogLayer({ region, revealed }: Props) {
  const key = quantizeRegion(region);
  const geometry = useMemo(
    () => computeFog(key, revealed),
    // Recompute only when the quantised viewport or the explored set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key.latitude, key.longitude, key.latitudeDelta, key.longitudeDelta, revealed],
  );

  return (
    <>
      {geometry.grid.map((cell, i) => (
        <Polygon key={`g${i}`} coordinates={cell} strokeColor="rgba(226,177,77,0.10)" strokeWidth={1} fillColor="transparent" zIndex={1} />
      ))}
      <Polygon
        coordinates={geometry.fog}
        holes={geometry.holes}
        fillColor={color.fog}
        strokeWidth={0}
        strokeColor="transparent"
        zIndex={2}
      />
      {geometry.islands.map((loop, i) => (
        <Polygon key={`i${i}`} coordinates={loop} fillColor={color.fog} strokeWidth={0} strokeColor="transparent" zIndex={2} />
      ))}
      {geometry.shores.map((loop, i) => (
        <Polygon key={`s${i}`} coordinates={loop} strokeColor="rgba(111,183,160,0.85)" strokeWidth={2} fillColor="rgba(111,183,160,0.06)" zIndex={3} />
      ))}
    </>
  );
});
