import { describe, expect, it } from 'vitest';
import { buildMaze, DIRS, Maze } from './grid';

describe('Maze の初期状態', () => {
  it('全セルが四方を壁で囲まれている', () => {
    const maze = new Maze(3, 2);
    expect(maze.cellCount).toBe(6);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 3; x++) {
        expect(maze.wallCount(x, y)).toBe(4);
        expect(maze.linked(x, y)).toEqual([]);
      }
    }
  });
});

describe('carve', () => {
  it('両側のセルの壁を取り除く', () => {
    const maze = new Maze(3, 3);
    maze.carve(1, 1, 1); // 東へ
    expect(maze.hasWall(1, 1, DIRS[1]!.bit)).toBe(false); // (1,1)の東壁
    expect(maze.hasWall(2, 1, DIRS[3]!.bit)).toBe(false); // (2,1)の西壁
    expect(maze.linked(1, 1)).toContainEqual({ x: 2, y: 1 });
    expect(maze.linked(2, 1)).toContainEqual({ x: 1, y: 1 });
  });

  it('盤外へは掘らない', () => {
    const maze = new Maze(2, 2);
    maze.carve(0, 0, 0); // 北は盤外
    expect(maze.wallCount(0, 0)).toBe(4);
  });

  it('行き止まりは壁が3つ', () => {
    const maze = new Maze(3, 3);
    maze.carve(1, 1, 1);
    expect(maze.wallCount(1, 1)).toBe(3);
  });
});

describe('buildMaze', () => {
  it('ステップ列を適用して通路を作る', () => {
    const maze = buildMaze(2, 1, [{ x: 0, y: 0, dir: 1 }]);
    expect(maze.linked(0, 0)).toEqual([{ x: 1, y: 0 }]);
  });
});
