import { describe, expect, it } from 'vitest';
import { makePRNG, pick, randInt, shuffle } from './rng';

describe('makePRNG', () => {
  it('同じseedは同じ列、違うseedは違う列', () => {
    const a = makePRNG(1);
    const b = makePRNG(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(makePRNG(1)()).not.toBe(makePRNG(2)());
  });

  it('0..1を返す', () => {
    const rng = makePRNG(99);
    for (let i = 0; i < 500; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('randInt / pick', () => {
  it('randIntは0以上n未満', () => {
    const rng = makePRNG(3);
    for (let i = 0; i < 500; i++) {
      const v = randInt(rng, 7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });

  it('pickは要素のいずれか', () => {
    const items = ['a', 'b', 'c'];
    expect(items).toContain(pick(makePRNG(5), items));
  });
});

describe('shuffle', () => {
  it('元を並べ替えた順列で、元配列は壊さない', () => {
    const src = [1, 2, 3, 4, 5, 6];
    const out = shuffle(makePRNG(7), src);
    expect([...out].sort((a, b) => a - b)).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('同じseedは同じ並び', () => {
    expect(shuffle(makePRNG(7), [1, 2, 3, 4, 5])).toEqual(shuffle(makePRNG(7), [1, 2, 3, 4, 5]));
  });
});
