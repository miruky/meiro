import { describe, expect, it } from 'vitest';
import { clampSize, decodeConfig, encodeConfig, type MazeConfig } from './share';

const sample: MazeConfig = { algorithm: 'wilson', width: 20, height: 14, seed: 123456 };

describe('clampSize', () => {
  it('範囲外を丸め、小数は整数化', () => {
    expect(clampSize(1)).toBe(5);
    expect(clampSize(999)).toBe(60);
    expect(clampSize(15.6)).toBe(16);
  });
});

describe('encode と decode の往復', () => {
  it('設定を復元できる', () => {
    expect(decodeConfig(encodeConfig(sample))).toEqual(sample);
  });

  it('先頭の # や c= を許す', () => {
    expect(decodeConfig(`#c=${encodeConfig(sample)}`)).toEqual(sample);
  });
});

describe('decodeConfig の頑健さ', () => {
  it('形式や範囲が不正なら null', () => {
    expect(decodeConfig('')).toBeNull();
    expect(decodeConfig('1|wilson|20|14')).toBeNull();
    expect(decodeConfig('2|wilson|20|14|1')).toBeNull(); // 版違い
    expect(decodeConfig('1|nope|20|14|1')).toBeNull(); // 未知アルゴリズム
    expect(decodeConfig('1|wilson|2|14|1')).toBeNull(); // 小さすぎ
    expect(decodeConfig('1|wilson|20|999|1')).toBeNull(); // 大きすぎ
  });
});
