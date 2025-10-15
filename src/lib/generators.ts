// 迷路生成アルゴリズム。いずれも「壁を取り除く手」の列(CarveStep[])を返し、
// 全部を適用すると全域木=完璧な迷路(全セル連結・閉路なし)になる。乱数はシード付きの
// rngだけを使うので生成は再現可能で、手順の列をそのままアニメーションに使える。

import { type CarveStep, DIRS } from './grid';
import { pick, randInt, shuffle } from './rng';

type RNG = () => number;

const inBounds = (w: number, h: number, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < w && y < h;

// 深さ優先(再帰的バックトラッカー)。長い通路と少ない行き止まりが特徴。
function recursiveBacktracker(w: number, h: number, rng: RNG): CarveStep[] {
  const steps: CarveStep[] = [];
  const visited = new Uint8Array(w * h);
  const sx = randInt(rng, w);
  const sy = randInt(rng, h);
  const stack: Array<{ x: number; y: number }> = [{ x: sx, y: sy }];
  visited[sy * w + sx] = 1;
  while (stack.length > 0) {
    const cur = stack[stack.length - 1]!;
    let advanced = false;
    for (const dir of shuffle(rng, [0, 1, 2, 3])) {
      const d = DIRS[dir]!;
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      if (inBounds(w, h, nx, ny) && !visited[ny * w + nx]) {
        steps.push({ x: cur.x, y: cur.y, dir });
        visited[ny * w + nx] = 1;
        stack.push({ x: nx, y: ny });
        advanced = true;
        break;
      }
    }
    if (!advanced) stack.pop();
  }
  return steps;
}

// ランダム化Prim法。木の縁(フロンティア)から無作為に広げる。短い枝が多く行き止まりが多い。
function prim(w: number, h: number, rng: RNG): CarveStep[] {
  const steps: CarveStep[] = [];
  const visited = new Uint8Array(w * h);
  const frontier: CarveStep[] = [];
  const addEdges = (x: number, y: number): void => {
    for (let dir = 0; dir < 4; dir++) {
      const d = DIRS[dir]!;
      if (inBounds(w, h, x + d.dx, y + d.dy)) frontier.push({ x, y, dir });
    }
  };
  const sx = randInt(rng, w);
  const sy = randInt(rng, h);
  visited[sy * w + sx] = 1;
  addEdges(sx, sy);
  while (frontier.length > 0) {
    const i = randInt(rng, frontier.length);
    const edge = frontier[i]!;
    frontier[i] = frontier[frontier.length - 1]!;
    frontier.pop();
    const d = DIRS[edge.dir]!;
    const nx = edge.x + d.dx;
    const ny = edge.y + d.dy;
    if (visited[ny * w + nx]) continue;
    steps.push(edge);
    visited[ny * w + nx] = 1;
    addEdges(nx, ny);
  }
  return steps;
}

// ランダム化Kruskal法。全ての壁を無作為順に見て、分かれている領域だけをつなぐ。
function kruskal(w: number, h: number, rng: RNG): CarveStep[] {
  const parent = Array.from({ length: w * h }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const edges: CarveStep[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < w - 1) edges.push({ x, y, dir: 1 }); // 東
      if (y < h - 1) edges.push({ x, y, dir: 2 }); // 南
    }
  }
  const steps: CarveStep[] = [];
  for (const edge of shuffle(rng, edges)) {
    const d = DIRS[edge.dir]!;
    const a = find(edge.y * w + edge.x);
    const b = find((edge.y + d.dy) * w + (edge.x + d.dx));
    if (a !== b) {
      parent[a] = b;
      steps.push(edge);
    }
  }
  return steps;
}

// Wilson法。ループ消去ランダムウォークで木を育てる。偏りのない一様な迷路になる。
function wilson(w: number, h: number, rng: RNG): CarveStep[] {
  const steps: CarveStep[] = [];
  const inTree = new Uint8Array(w * h);
  inTree[randInt(rng, w * h)] = 1;
  for (let c = 0; c < w * h; c++) {
    if (inTree[c]) continue;
    let x = c % w;
    let y = Math.floor(c / w);
    const dirOf = new Map<number, number>();
    while (!inTree[y * w + x]) {
      let dir: number;
      let nx: number;
      let ny: number;
      do {
        dir = randInt(rng, 4);
        nx = x + DIRS[dir]!.dx;
        ny = y + DIRS[dir]!.dy;
      } while (!inBounds(w, h, nx, ny));
      dirOf.set(y * w + x, dir);
      x = nx;
      y = ny;
    }
    let cx = c % w;
    let cy = Math.floor(c / w);
    while (!inTree[cy * w + cx]) {
      const dir = dirOf.get(cy * w + cx)!;
      steps.push({ x: cx, y: cy, dir });
      inTree[cy * w + cx] = 1;
      cx += DIRS[dir]!.dx;
      cy += DIRS[dir]!.dy;
    }
  }
  return steps;
}

// Hunt-and-Kill。歩けるだけ歩き、行き詰まったら未踏かつ既踏に隣接するセルを探して再開する。
function huntAndKill(w: number, h: number, rng: RNG): CarveStep[] {
  const steps: CarveStep[] = [];
  const visited = new Uint8Array(w * h);
  let x = randInt(rng, w);
  let y = randInt(rng, h);
  visited[y * w + x] = 1;
  for (;;) {
    for (;;) {
      const opts = shuffle(rng, [0, 1, 2, 3]).filter((dir) => {
        const d = DIRS[dir]!;
        return inBounds(w, h, x + d.dx, y + d.dy) && !visited[(y + d.dy) * w + (x + d.dx)];
      });
      const dir = opts[0];
      if (dir === undefined) break;
      const d = DIRS[dir]!;
      steps.push({ x, y, dir });
      x += d.dx;
      y += d.dy;
      visited[y * w + x] = 1;
    }
    let found = false;
    for (let hy = 0; hy < h && !found; hy++) {
      for (let hx = 0; hx < w && !found; hx++) {
        if (visited[hy * w + hx]) continue;
        const vdirs = [0, 1, 2, 3].filter((dir) => {
          const d = DIRS[dir]!;
          return inBounds(w, h, hx + d.dx, hy + d.dy) && visited[(hy + d.dy) * w + (hx + d.dx)];
        });
        if (vdirs.length > 0) {
          const dir = pick(rng, vdirs);
          steps.push({ x: hx, y: hy, dir });
          x = hx;
          y = hy;
          visited[y * w + x] = 1;
          found = true;
        }
      }
    }
    if (!found) break;
  }
  return steps;
}

// Sidewinder。行ごとに東へ走り、区切りで run の中から1つ北へ抜ける。横の長い通路が出る。
function sidewinder(w: number, h: number, rng: RNG): CarveStep[] {
  const steps: CarveStep[] = [];
  for (let y = 0; y < h; y++) {
    let run: number[] = [];
    for (let x = 0; x < w; x++) {
      run.push(x);
      const atEast = x === w - 1;
      const atNorth = y === 0;
      if (!atEast && (atNorth || rng() < 0.5)) {
        steps.push({ x, y, dir: 1 }); // 東へ
      } else {
        if (!atNorth) {
          const cx = pick(rng, run);
          steps.push({ x: cx, y, dir: 0 }); // 北へ
        }
        run = [];
      }
    }
  }
  return steps;
}

export interface Generator {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  run(width: number, height: number, rng: RNG): CarveStep[];
}

export const GENERATORS: readonly Generator[] = [
  {
    id: 'backtracker',
    name: '再帰的バックトラッカー',
    description: '深さ優先で掘り進み、行き詰まると戻る。長い一本道が多く、行き止まりは少ない。',
    run: recursiveBacktracker,
  },
  {
    id: 'prim',
    name: 'Prim法',
    description: '木の縁から無作為に伸ばす。短い枝が放射状に広がり、行き止まりが多い。',
    run: prim,
  },
  {
    id: 'kruskal',
    name: 'Kruskal法',
    description: '壁を無作為順に見て、分かれた領域だけをつなぐ。均質で行き止まりが多い。',
    run: kruskal,
  },
  {
    id: 'wilson',
    name: 'Wilson法',
    description: 'ループ消去ランダムウォーク。どの全域木も等確率の、偏りのない迷路になる。',
    run: wilson,
  },
  {
    id: 'huntkill',
    name: 'Hunt-and-Kill',
    description: '歩けるだけ歩き、詰まったら既踏に隣接する未踏点から再開する。蛇行した通路が出る。',
    run: huntAndKill,
  },
  {
    id: 'sidewinder',
    name: 'Sidewinder',
    description: '行ごとに東へ走り、区切りで一つ北へ抜ける。最上段が一本道になる独特の偏り。',
    run: sidewinder,
  },
];

const BY_ID = new Map(GENERATORS.map((g) => [g.id, g]));

export function getGenerator(id: string): Generator | undefined {
  return BY_ID.get(id);
}
