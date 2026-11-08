// Seeded procedural bonsai (informal upright / moyogi style). Pure data: plain [x,y,z] arrays.
// Mulberry32 seeded RNG (Component Library L2 pattern).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function sampleAt(points, t) {
  const f = t * (points.length - 1);
  const i = Math.min(Math.floor(f), points.length - 2);
  return lerp3(points[i], points[i + 1], f - i);
}

export const SOIL_Y = 0.6;
export const TRUNK_R0 = 0.24;
export const TRUNK_R1 = 0.055;

export function generateBonsai(seed = 7) {
  const r = rng(seed);
  const segments = [];
  const pads = [];
  const H = 2.0;

  // Trunk: S-curve that tightens toward the apex.
  const n = 10;
  const ph = r() * Math.PI * 2;
  const amp = 0.26 + r() * 0.1;
  const lean = (r() - 0.5) * 0.25;
  const trunk = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    trunk.push([
      Math.sin(t * 3.4 + ph) * amp * (1 - t * 0.35) + lean * t - Math.sin(ph) * amp,
      SOIL_Y - 0.05 + t * H,
      Math.cos(t * 2.6 + ph) * amp * 0.45 * t,
    ]);
  }
  segments.push({ kind: 'trunk', points: trunk, r0: TRUNK_R0, r1: TRUNK_R1, flare: true });
  pads.push({ c: add(trunk[n], [0, 0.12, 0]), rx: 0.5, ry: 0.26 });

  // Branches: alternate around the trunk (≈ golden angle), shorter toward the top, slight droop then lift.
  const nb = 7 + Math.floor(r() * 3);
  let ang = r() * Math.PI * 2;
  for (let b = 0; b < nb; b++) {
    const t = 0.3 + (b / (nb - 1)) * 0.58 + (r() - 0.5) * 0.03;
    const p = sampleAt(trunk, t);
    ang += 2.4 + (r() - 0.5) * 0.6;
    const len = (1.3 - t * 0.95) * (0.8 + r() * 0.35);
    const d = [Math.cos(ang), 0, Math.sin(ang) * 0.75];
    const pts = [
      p,
      add(add(p, scale(d, len * 0.3)), [0, 0.06, 0]),
      add(add(p, scale(d, len * 0.65)), [(r() - 0.5) * 0.1, -0.03, (r() - 0.5) * 0.1]),
      add(add(p, scale(d, len)), [0, 0.07, 0]),
    ];
    const tr = TRUNK_R0 + (TRUNK_R1 - TRUNK_R0) * t;
    const r0 = tr * 0.55;
    segments.push({ kind: 'branch', points: pts, r0, r1: 0.018 });
    pads.push({ c: add(pts[3], [0, 0.05, 0]), rx: 0.3 + len * 0.28, ry: 0.13 + len * 0.05 });

    if (len > 0.55) {
      const mid = pts[2];
      const a2 = ang + (r() > 0.5 ? 0.95 : -0.95);
      const sl = len * 0.45;
      const tip = add(mid, [Math.cos(a2) * sl, 0.06, Math.sin(a2) * sl * 0.75]);
      segments.push({ kind: 'branch', points: [mid, add(lerp3(mid, tip, 0.5), [0, 0.03, 0]), tip], r0: r0 * 0.5, r1: 0.014 });
      pads.push({ c: add(tip, [0, 0.04, 0]), rx: 0.22 + sl * 0.3, ry: 0.11 });
    }
  }

  // Nebari: surface roots spreading over the soil, kept inside the pot.
  const nr = 5 + Math.floor(r() * 2);
  const b0 = trunk[0];
  for (let k = 0; k < nr; k++) {
    const a = (k / nr) * Math.PI * 2 + r() * 0.5;
    const c = Math.cos(a), s = Math.sin(a) * 0.55;
    segments.push({
      kind: 'root',
      points: [add(b0, [c * 0.08, 0.1, s * 0.08]), add(b0, [c * 0.3, 0.04, s * 0.3]), add(b0, [c * 0.52, 0.0, s * 0.5])],
      r0: 0.09,
      r1: 0.015,
    });
  }

  return { seed, segments, pads };
}

// Leaf placement inside each pad: a flattened dome, denser and higher in the middle.
export function placeLeaves(pads, seed = 7, density = 650) {
  const r = rng(seed * 31 + 5);
  const leaves = [];
  for (const p of pads) {
    const count = Math.floor(p.rx * p.rx * density) + 12;
    for (let i = 0; i < count; i++) {
      const rho = Math.sqrt(r());
      const th = r() * Math.PI * 2;
      const dome = Math.sqrt(Math.max(0, 1 - rho * rho));
      leaves.push({
        pos: [p.c[0] + Math.cos(th) * rho * p.rx, p.c[1] + p.ry * dome * (0.15 + 0.85 * r()) - p.ry * 0.25, p.c[2] + Math.sin(th) * rho * p.rx * 0.85],
        yaw: r() * Math.PI * 2,
        pitch: -0.3 - r() * 0.9, // mostly facing up
        roll: (r() - 0.5) * 0.8,
        size: 0.08 + r() * 0.045,
        tone: r(), // < 0.04 → faded yellow
      });
    }
  }
  return leaves;
}
