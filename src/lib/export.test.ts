import { describe, expect, it } from 'vitest';
import { buildMaze } from './grid';
import { getGenerator } from './generators';
import { makePRNG } from './rng';
import { solve } from './solve';
import { DARK_THEME, exportFilename, mazeToSvg } from './export';

function sampleMaze(w = 8, h = 6, seed = 42) {
  const steps = getGenerator('backtracker')!.run(w, h, makePRNG(seed));
  return buildMaze(w, h, steps);
}

describe('mazeToSvg', () => {
  it('単体で開けるSVG要素を返す', () => {
    const svg = mazeToSvg(sampleMaze());
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('role="img"');
  });

  it('余白込みの寸法が unit と padding に比例する', () => {
    const maze = sampleMaze(8, 6);
    const svg = mazeToSvg(maze, { unit: 10, padding: 5 });
    // 8*10 + 5*2 = 90, 6*10 + 5*2 = 70
    expect(svg).toContain('viewBox="0 0 90 70"');
    expect(svg).toContain('width="90"');
    expect(svg).toContain('height="70"');
  });

  it('解答を渡したときだけ経路の polyline を含む', () => {
    const maze = sampleMaze();
    expect(mazeToSvg(maze)).not.toContain('<polyline');
    const path = solve(maze)!.path;
    expect(mazeToSvg(maze, { solution: path })).toContain('<polyline');
  });

  it('テーマの色を焼き込む(currentColor を使わない)', () => {
    const svg = mazeToSvg(sampleMaze(), { theme: DARK_THEME });
    expect(svg).toContain(DARK_THEME.wall);
    expect(svg).toContain(DARK_THEME.background);
    expect(svg).not.toContain('currentColor');
  });

  it('壁のパスを含む', () => {
    expect(mazeToSvg(sampleMaze())).toContain('<path d="M0 0H');
  });
});

describe('exportFilename', () => {
  it('設定が分かる名前を作る', () => {
    expect(exportFilename('prim', 20, 14, 123)).toBe('meiro-prim-20x14-123');
  });

  it('シードを符号なし32ビットに丸める', () => {
    expect(exportFilename('wilson', 10, 10, -1)).toBe('meiro-wilson-10x10-4294967295');
  });
});
