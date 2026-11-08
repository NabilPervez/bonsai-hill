import { describe, it, expect } from 'vitest';
import { generateBonsai, placeLeaves, rng, sampleAt, SOIL_Y } from './bonsai.js';

describe('rng', () => {
  it('is deterministic per seed and in [0,1)', () => {
    const a = rng(42), b = rng(42), c = rng(43);
    const xs = Array.from({ length: 50 }, a);
    expect(xs).toEqual(Array.from({ length: 50 }, b));
    expect(xs).not.toEqual(Array.from({ length: 50 }, c));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});

describe('generateBonsai', () => {
  const t = generateBonsai(7);
  it('same seed → same tree', () => {
    expect(generateBonsai(7)).toEqual(t);
  });
  it('has one trunk, 7–9+ branches, roots and pads', () => {
    expect(t.segments.filter((s) => s.kind === 'trunk')).toHaveLength(1);
    expect(t.segments.filter((s) => s.kind === 'branch').length).toBeGreaterThanOrEqual(7);
    expect(t.segments.filter((s) => s.kind === 'root').length).toBeGreaterThanOrEqual(5);
    expect(t.pads.length).toBeGreaterThanOrEqual(8);
  });
  it('tapers: every segment narrows toward its tip', () => {
    t.segments.forEach((s) => expect(s.r1).toBeLessThan(s.r0));
  });
  it('trunk rises from the soil', () => {
    const tr = t.segments[0].points;
    expect(tr[0][1]).toBeLessThan(SOIL_Y);
    expect(tr.at(-1)[1]).toBeGreaterThan(SOIL_Y + 1.5);
  });
  it('roots stay inside the pot footprint', () => {
    t.segments.filter((s) => s.kind === 'root').forEach((s) => {
      const tip = s.points.at(-1);
      expect(Math.abs(tip[2])).toBeLessThan(0.5);
    });
  });
  it('sampleAt interpolates', () => {
    expect(sampleAt([[0, 0, 0], [2, 2, 2]], 0.5)).toEqual([1, 1, 1]);
  });
});

describe('placeLeaves', () => {
  it('fills pads within budget and is deterministic', () => {
    const { pads } = generateBonsai(7);
    const l = placeLeaves(pads, 7);
    expect(l.length).toBeGreaterThan(1200);
    expect(l.length).toBeLessThan(9000);
    expect(placeLeaves(pads, 7)).toEqual(l);
  });
});
