import { describe, expect, it } from 'vitest';
import { buildMaze, type Maze } from './grid';
import { GENERATORS, getGenerator } from './generators';
import { makePRNG } from './rng';

// (0,0)から壁なしで到達できるセル数を数える。全セルに届けば連結。
function reachableCount(maze: Maze): number {
  const w = maze.width;
  const seen = new Uint8Array(w * maze.height);
  const stack = [{ x: 0, y: 0 }];
  seen[0] = 1;
  let count = 0;
  while (stack.length > 0) {
    const cur = stack.pop()!;
    count += 1;
    for (const n of maze.linked(cur.x, cur.y)) {
      const i = n.y * w + n.x;
      if (!seen[i]) {
        seen[i] = 1;
        stack.push(n);
      }
    }
  }
  return count;
}

const SIZES: Array<[number, number]> = [
  [8, 8],
  [12, 7],
  [5, 5],
  [20, 14],
];

describe('全生成器が完璧な迷路を作る', () => {
  for (const gen of GENERATORS) {
    for (const [w, h] of SIZES) {
      it(`${gen.id} ${w}x${h}: 全域木(連結かつ閉路なし)`, () => {
        const steps = gen.run(w, h, makePRNG(12345));
        // 全域木は辺数 = セル数 - 1
        expect(steps.length).toBe(w * h - 1);
        const maze = buildMaze(w, h, steps);
        // 連結: 全セルに到達できる
        expect(reachableCount(maze)).toBe(w * h);
      });
    }
  }
});

describe('生成は再現可能', () => {
  it('同じseedからは同一の手順', () => {
    for (const gen of GENERATORS) {
      expect(gen.run(10, 10, makePRNG(42))).toEqual(gen.run(10, 10, makePRNG(42)));
    }
  });

  it('違うseedからは異なる手順になりうる', () => {
    const gen = getGenerator('backtracker')!;
    expect(gen.run(12, 12, makePRNG(1))).not.toEqual(gen.run(12, 12, makePRNG(2)));
  });
});

describe('getGenerator', () => {
  it('idで引け、未知idはundefined', () => {
    expect(getGenerator('prim')?.name).toBe('Prim法');
    expect(getGenerator('nope')).toBeUndefined();
  });
});
