import { LEVEL_THRESHOLDS, levelForXp, levelProgress, xpToNext } from '../levels';

describe('levels', () => {
  it('uses round(100 * L^1.5) per level', () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(2)).toBe(283);
    expect(xpToNext(10)).toBe(3162);
  });

  it('maps XP to levels at the thresholds', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(LEVEL_THRESHOLDS[50])).toBe(50);
    expect(levelForXp(Number.MAX_SAFE_INTEGER)).toBe(100);
  });

  it('reports progress inside a level', () => {
    expect(levelProgress(150)).toEqual({ level: 2, current: 50, needed: 283, ratio: 50 / 283 });
    expect(levelProgress(Number.MAX_SAFE_INTEGER).ratio).toBe(1);
  });
});
