// 迷路の格子モデル。各セルは上下左右の壁ビットを持ち、初期状態は全方向に壁がある。
// 隣接セルとの間の壁を取り除くことで通路を「掘る」。生成も探索もこのモデルを共有する。

export interface Dir {
  readonly name: 'N' | 'E' | 'S' | 'W';
  readonly dx: number;
  readonly dy: number;
  /** このセル側の壁ビット */
  readonly bit: number;
  /** 反対側セルの壁ビット */
  readonly opp: number;
}

export const DIRS: readonly Dir[] = [
  { name: 'N', dx: 0, dy: -1, bit: 1, opp: 4 },
  { name: 'E', dx: 1, dy: 0, bit: 2, opp: 8 },
  { name: 'S', dx: 0, dy: 1, bit: 4, opp: 1 },
  { name: 'W', dx: -1, dy: 0, bit: 8, opp: 2 },
];

const ALL_WALLS = 1 | 2 | 4 | 8;

export interface Cell {
  readonly x: number;
  readonly y: number;
}

/** 生成過程の1手。(x,y)から方向dirへ壁を取り除く */
export interface CarveStep {
  readonly x: number;
  readonly y: number;
  /** DIRSのインデックス */
  readonly dir: number;
}

export class Maze {
  readonly width: number;
  readonly height: number;
  private readonly walls: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.walls = new Uint8Array(width * height).fill(ALL_WALLS);
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  get cellCount(): number {
    return this.width * this.height;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  hasWall(x: number, y: number, bit: number): boolean {
    return (this.walls[this.index(x, y)]! & bit) !== 0;
  }

  /** (x,y)から方向dirへ壁を取り除く。両側のセルの壁を消す */
  carve(x: number, y: number, dir: number): void {
    const d = DIRS[dir]!;
    const nx = x + d.dx;
    const ny = y + d.dy;
    if (!this.inBounds(nx, ny)) return;
    this.walls[this.index(x, y)]! &= ~d.bit;
    this.walls[this.index(nx, ny)]! &= ~d.opp;
  }

  applyStep(step: CarveStep): void {
    this.carve(step.x, step.y, step.dir);
  }

  /** (x,y)と壁なしでつながっている隣接セル */
  linked(x: number, y: number): Cell[] {
    const out: Cell[] = [];
    for (const d of DIRS) {
      if (!this.hasWall(x, y, d.bit) && this.inBounds(x + d.dx, y + d.dy)) {
        out.push({ x: x + d.dx, y: y + d.dy });
      }
    }
    return out;
  }

  /** そのセルの壁の数(0..4)。行き止まりは3 */
  wallCount(x: number, y: number): number {
    const w = this.walls[this.index(x, y)]!;
    return ((w >> 0) & 1) + ((w >> 1) & 1) + ((w >> 2) & 1) + ((w >> 3) & 1);
  }
}

/** ステップ列を新しい迷路に適用して完成形を得る */
export function buildMaze(width: number, height: number, steps: readonly CarveStep[]): Maze {
  const maze = new Maze(width, height);
  for (const step of steps) maze.applyStep(step);
  return maze;
}
