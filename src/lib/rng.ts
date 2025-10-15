// シード付きの擬似乱数。同じシードからは同じ迷路が生成されるよう、生成器はすべて
// この乱数だけを使う。mulberry32は軽量で素性が良く、再現性のある列を返す。

export function makePRNG(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 0以上n未満の整数 */
export function randInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n);
}

/** 配列から1つ選ぶ */
export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[randInt(rng, items.length)]!;
}

/** Fisher-Yatesで新しい配列を返す(元は壊さない) */
export function shuffle<T>(rng: () => number, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
