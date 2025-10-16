import { describe, expect, it } from 'vitest';
import { buildMaze, type Cell, Maze } from './grid';
import { GENERATORS } from './generators';
import { makePRNG } from './rng';
import { analyze, solve } from './solve';

function adjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

describe('solve', () => {
  it('一直線の通路で端から端までの経路を返す', () => {
    // 1行3列を横に貫通
    const maze = buildMaze(3, 1, [
      { x: 0, y: 0, dir: 1 },
      { x: 1, y: 0, dir: 1 },
    ]);
    const result = solve(maze)!;
    expect(result.path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it('生成された迷路で、隣接し通路でつながった有効な経路を返す', () => {
    for (const gen of GENERATORS) {
      const maze = buildMaze(14, 10, gen.run(14, 10, makePRNG(7)));
      const result = solve(maze)!;
      expect(result.path[0]).toEqual({ x: 0, y: 0 });
      expect(result.path[result.path.length - 1]).toEqual({ x: 13, y: 9 });
      for (let i = 1; i < result.path.length; i++) {
        const prev = result.path[i - 1]!;
        const cur = result.path[i]!;
        expect(adjacent(prev, cur)).toBe(true);
        expect(maze.linked(prev.x, prev.y)).toContainEqual(cur);
      }
    }
  });

  it('壁で隔てられていれば到達不能でnull', () => {
    const maze = new Maze(2, 1); // 何も掘らない
    expect(solve(maze)).toBeNull();
  });
});

describe('analyze', () => {
  it('完璧な迷路では通路数 = セル数 - 1、解は端を結ぶ', () => {
    const maze = buildMaze(12, 12, GENERATORS[0]!.run(12, 12, makePRNG(3)));
    const stats = analyze(maze);
    expect(stats.cells).toBe(144);
    expect(stats.passages).toBe(143);
    expect(stats.deadEnds).toBeGreaterThan(0);
    expect(stats.deadEndRatio).toBeGreaterThan(0);
    expect(stats.deadEndRatio).toBeLessThanOrEqual(1);
    expect(stats.solutionLength).toBeGreaterThanOrEqual(12 + 12 - 1);
  });
});
