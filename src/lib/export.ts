// 迷路を単体で開けるSVG文字列に書き出す。画面と同じ壁の幾何(wallPathD)を使い、
// 入口・出口のマーカーと、任意で解答の最短経路を重ねる。色は currentColor ではなく
// テーマごとに焼き込み、ファイル単体でもライト/ダークどちらかで正しく見えるようにする。

import { type Cell, type Maze, wallPathD } from './grid';

export interface ExportTheme {
  readonly background: string;
  readonly wall: string;
  readonly start: string;
  readonly goal: string;
  readonly solution: string;
}

export const LIGHT_THEME: ExportTheme = {
  background: '#ffffff',
  wall: '#2b2a22',
  start: '#117e6f',
  goal: '#c25733',
  solution: '#117e6f',
};

export const DARK_THEME: ExportTheme = {
  background: '#1a1a14',
  wall: '#c9c4b3',
  start: '#36b6a3',
  goal: '#e0794f',
  solution: '#36b6a3',
};

export interface ExportOptions {
  /** 1セルの辺の長さ(px) */
  readonly unit?: number;
  /** 盤面の外側に取る余白(px)。既定は unit と同じ */
  readonly padding?: number;
  readonly theme?: ExportTheme;
  /** 重ねる解答経路。省略・null なら描かない */
  readonly solution?: readonly Cell[] | null;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 迷路を完全な(単体で表示可能な)SVG文字列にする */
export function mazeToSvg(maze: Maze, opts: ExportOptions = {}): string {
  const unit = opts.unit ?? 16;
  const pad = opts.padding ?? unit;
  const theme = opts.theme ?? LIGHT_THEME;
  const stroke = round(Math.max(1, unit * 0.16));
  const innerW = maze.width * unit;
  const innerH = maze.height * unit;
  const totalW = innerW + pad * 2;
  const totalH = innerH + pad * 2;
  const m = unit * 0.22; // マーカーの内側マージン
  const markerSize = unit - m * 2;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" ` +
      `width="${totalW}" height="${totalH}" role="img" ` +
      `aria-label="${maze.width}かける${maze.height}の迷路">`,
  );
  parts.push(`<rect width="${totalW}" height="${totalH}" fill="${theme.background}"/>`);
  parts.push(`<g transform="translate(${pad} ${pad})">`);
  parts.push(
    `<rect x="${round(m)}" y="${round(m)}" width="${round(markerSize)}" ` +
      `height="${round(markerSize)}" rx="${round(unit * 0.2)}" fill="${theme.start}"/>`,
  );
  parts.push(
    `<rect x="${round((maze.width - 1) * unit + m)}" y="${round((maze.height - 1) * unit + m)}" ` +
      `width="${round(markerSize)}" height="${round(markerSize)}" rx="${round(unit * 0.2)}" ` +
      `fill="${theme.goal}"/>`,
  );

  if (opts.solution && opts.solution.length > 1) {
    const points = opts.solution
      .map((c) => `${round(c.x * unit + unit / 2)},${round(c.y * unit + unit / 2)}`)
      .join(' ');
    parts.push(
      `<polyline points="${points}" fill="none" stroke="${theme.solution}" ` +
        `stroke-width="${round(stroke * 2)}" stroke-linecap="round" ` +
        `stroke-linejoin="round" opacity="0.95"/>`,
    );
  }

  parts.push(
    `<path d="${wallPathD(maze, unit)}" fill="none" stroke="${theme.wall}" ` +
      `stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
  parts.push('</g></svg>');
  return parts.join('');
}

/** 既定の書き出しファイル名。設定が分かるよう algorithm・寸法・シードを含める */
export function exportFilename(
  algorithm: string,
  width: number,
  height: number,
  seed: number,
): string {
  return `meiro-${algorithm}-${width}x${height}-${seed >>> 0}`;
}
