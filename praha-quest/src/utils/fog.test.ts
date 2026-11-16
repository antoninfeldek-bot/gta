import { latLngToCell } from 'h3-js';
import { computeFog, quantizeRegion } from './fog';

const region = { latitude: 50.0875, longitude: 14.4213, latitudeDelta: 0.01, longitudeDelta: 0.01 };

describe('fog geometry', () => {
  it('is one viewport polygon with no holes before exploring', () => {
    const fog = computeFog(region, {});
    expect(fog.fog).toHaveLength(4);
    expect(fog.holes).toHaveLength(0);
    expect(fog.grid.length).toBeGreaterThan(0);
  });

  it('cuts explored cells into the fog and skips them in the grid', () => {
    const cell = latLngToCell(region.latitude, region.longitude, 9);
    const before = computeFog(region, {}).grid.length;
    const fog = computeFog(region, { [cell]: 1 });
    expect(fog.holes).toHaveLength(1);
    expect(fog.holes[0]).toHaveLength(6);
    expect(fog.grid.length).toBe(before - 1);
  });

  it('hides the grid when zoomed out and caps work', () => {
    expect(computeFog({ ...region, latitudeDelta: 0.2, longitudeDelta: 0.2 }, {}).grid).toHaveLength(0);
  });

  it('quantises nearby regions to the same key', () => {
    const base = { ...region, latitude: 50.088 };
    const a = quantizeRegion(base);
    const b = quantizeRegion({ ...base, latitude: base.latitude + 0.0001 });
    expect(a).toEqual(b);
  });
});
