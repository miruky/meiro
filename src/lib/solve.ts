// 迷路の探索と分析。BFSで最短経路を求め、訪問順も返すので解答のアニメーションに使える。
// 行き止まりの割合や解の長さは、アルゴリズムごとの性格を見比べる指標になる。

import { type Cell, Maze } from './grid';

export interface SolveResult {
  /** start から goal までの最短経路(両端含む) */
  readonly path: Cell[];
  /** BFSがセルを確定した順。解答の広がりを見せるのに使う */
  readonly visitedOrder: Cell[];
}

function topLeft(): Cell {
  return { x: 0, y: 0 };
}

function bottomRight(maze: Maze): Cell {
  return { x: maze.width - 1, y: maze.height - 1 };
}

/** BFSで最短経路を求める。到達不能なら null(完璧な迷路では常に到達できる) */
export function solve(
  maze: Maze,
  start: Cell = topLeft(),
  goal: Cell = bottomRight(maze),
): SolveResult | null {
  const w = maze.width;
  const came = new Int32Array(w * maze.height).fill(-1);
  const seen = new Uint8Array(w * maze.height);
  const queue: Cell[] = [start];
  const visitedOrder: Cell[] = [];
  seen[start.y * w + start.x] = 1;
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++]!;
    visitedOrder.push(cur);
    if (cur.x === goal.x && cur.y === goal.y) {
      return { path: reconstruct(came, w, start, goal), visitedOrder };
    }
    for (const n of maze.linked(cur.x, cur.y)) {
      const ni = n.y * w + n.x;
      if (!seen[ni]) {
        seen[ni] = 1;
        came[ni] = cur.y * w + cur.x;
        queue.push(n);
      }
    }
  }
  return null;
}

function reconstruct(came: Int32Array, w: number, start: Cell, goal: Cell): Cell[] {
  const path: Cell[] = [];
  let i = goal.y * w + goal.x;
  const startIndex = start.y * w + start.x;
  while (i !== -1) {
    path.push({ x: i % w, y: Math.floor(i / w) });
    if (i === startIndex) break;
    i = came[i]!;
  }
  return path.reverse();
}

export interface MazeStats {
  readonly cells: number;
  readonly passages: number;
  readonly deadEnds: number;
  readonly deadEndRatio: number;
  readonly solutionLength: number;
}

/** 行き止まりの数・通路数・解の長さなど、迷路の性格を表す指標 */
export function analyze(
  maze: Maze,
  start: Cell = topLeft(),
  goal: Cell = bottomRight(maze),
): MazeStats {
  let linkSum = 0;
  let deadEnds = 0;
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      const links = maze.linked(x, y).length;
      linkSum += links;
      if (links === 1) deadEnds += 1;
    }
  }
  const cells = maze.cellCount;
  const solved = solve(maze, start, goal);
  return {
    cells,
    passages: linkSum / 2,
    deadEnds,
    deadEndRatio: deadEnds / cells,
    solutionLength: solved ? solved.path.length : 0,
  };
}
