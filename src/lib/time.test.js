import { describe, it, expect } from 'vitest';
import { sceneMinutes, phaseOf, sunPosition, moonPosition, paletteAt, mixHex, parsePinnedTime, PHASES } from './time.js';

describe('scene clock', () => {
  it('starts at local time and compresses 4x', () => {
    const start = new Date(2026, 10, 7, 9, 0, 0);
    expect(sceneMinutes(start, start.getTime())).toBeCloseTo(540);
    expect(sceneMinutes(start, start.getTime() + 60000)).toBeCloseTo(544);
  });
  it('wraps past midnight', () => {
    const start = new Date(2026, 10, 7, 23, 58, 0);
    expect(sceneMinutes(start, start.getTime() + 60000)).toBeCloseTo(2);
  });
});

describe('phases', () => {
  it('covers all 5 phases across a day', () => {
    const seen = new Set();
    for (let m = 0; m < 1440; m += 10) seen.add(phaseOf(m));
    expect([...seen].sort()).toEqual([...PHASES].sort());
  });
  it('maps key hours', () => {
    expect(phaseOf(6 * 60)).toBe('dawn');
    expect(phaseOf(12 * 60)).toBe('day');
    expect(phaseOf(17 * 60)).toBe('golden');
    expect(phaseOf(18.5 * 60)).toBe('dusk');
    expect(phaseOf(2 * 60)).toBe('night');
  });
});

describe('sun and moon', () => {
  it('sun peaks at noon, below horizon at midnight', () => {
    expect(sunPosition(720).elevation).toBeCloseTo(1);
    expect(sunPosition(0).elevation).toBeLessThan(0);
  });
  it('moon is up when sun is down', () => {
    expect(moonPosition(0).elevation).toBeCloseTo(1);
    expect(moonPosition(720).elevation).toBeLessThan(0);
  });
});

describe('palette', () => {
  it('mixes hex', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
  it('is continuous at midnight', () => {
    expect(paletteAt(0).skyTop).toBe(paletteAt(1439.99).skyTop);
  });
  it('is brighter at noon than midnight', () => {
    expect(paletteAt(720).intensity).toBeGreaterThan(paletteAt(0).intensity);
  });
});

describe('pinned time', () => {
  it('parses ?t=HH:MM', () => {
    expect(parsePinnedTime('?t=17:30')).toBe(1050);
    expect(parsePinnedTime('?t=25:00')).toBeNull();
    expect(parsePinnedTime('')).toBeNull();
  });
});
