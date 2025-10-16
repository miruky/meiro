// 迷路の設定(アルゴリズム・大きさ・シード)をURLで共有するためのエンコード/デコード。
// 設定を短い文字列に畳んでハッシュに載せ、開いたときに同じ迷路を再現する。

import { getGenerator } from './generators';

export interface MazeConfig {
  readonly algorithm: string;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
}

export const MIN_SIZE = 5;
export const MAX_SIZE = 60;
export const MAX_SEED = 0xffffffff;

const VERSION = '1';

export function clampSize(n: number): number {
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(n)));
}

export function encodeConfig(config: MazeConfig): string {
  return [VERSION, config.algorithm, config.width, config.height, config.seed >>> 0].join('|');
}

export function decodeConfig(input: string): MazeConfig | null {
  const body = input.replace(/^#/, '').replace(/^c=/, '');
  const parts = body.split('|');
  if (parts.length !== 5) return null;
  const [version, algorithm, wRaw, hRaw, seedRaw] = parts;
  if (version !== VERSION) return null;
  if (!getGenerator(algorithm!)) return null;

  const width = toInt(wRaw);
  const height = toInt(hRaw);
  const seed = toInt(seedRaw);
  if (width === null || width < MIN_SIZE || width > MAX_SIZE) return null;
  if (height === null || height < MIN_SIZE || height > MAX_SIZE) return null;
  if (seed === null || seed < 0 || seed > MAX_SEED) return null;

  return { algorithm: algorithm!, width, height, seed };
}

function toInt(value: string | undefined): number | null {
  if (value === undefined || !/^\d+$/.test(value)) return null;
  return Number.parseInt(value, 10);
}
