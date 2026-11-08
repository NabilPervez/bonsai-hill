// Scene clock: local time, compressed (estimate from PRD: 1 real min = 4 scene min),
// re-synced to real time on every new tab load.
export const COMPRESSION = 4;

export function sceneMinutes(startDate, nowMs, compression = COMPRESSION) {
  const startMin = startDate.getHours() * 60 + startDate.getMinutes() + startDate.getSeconds() / 60;
  const elapsedMin = (nowMs - startDate.getTime()) / 60000;
  return mod(startMin + elapsedMin * compression, 1440);
}

export const mod = (a, n) => ((a % n) + n) % n;

// Simple stylised sun: rises 06:00, sets 18:00. Returns elevation (-1..1) and azimuth angle.
export function sunPosition(minutes) {
  const t = (minutes - 360) / 720; // 0 at sunrise, 1 at sunset
  const angle = t * Math.PI;
  return { elevation: Math.sin(angle), azimuth: Math.cos(angle), angle };
}

// Moon is opposite the sun.
export function moonPosition(minutes) {
  return sunPosition(mod(minutes + 720, 1440));
}

export const PHASES = ['night', 'dawn', 'day', 'golden', 'dusk'];

export function phaseOf(minutes) {
  const h = minutes / 60;
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 16.5) return 'day';
  if (h >= 16.5 && h < 18) return 'golden';
  if (h >= 18 && h < 19.5) return 'dusk';
  return 'night';
}

// Palette keyframes per hour (Ink & Ember proposal): sky top, horizon, light color, light intensity.
const KEYS = [
  [0, '#0b1020', '#1c2440', '#7d93c8', 0.25],
  [5, '#1d2340', '#c58a8a', '#f2b8a0', 0.35],
  [6.5, '#6f8fb8', '#f3c9a0', '#ffd9b0', 0.8],
  [9, '#6f9fd0', '#cfe0ea', '#fff6e8', 1.2],
  [15, '#6f9fd0', '#d6e2e6', '#fff1dc', 1.15],
  [17, '#c88a5a', '#f2b56a', '#ffb060', 1.0],
  [18.3, '#4a3a6a', '#b0688a', '#d08090', 0.5],
  [19.5, '#141a33', '#2b2e55', '#8090c8', 0.28],
  [24, '#0b1020', '#1c2440', '#7d93c8', 0.25],
];

export function paletteAt(minutes) {
  const h = minutes / 60;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = (h - a[0]) / (b[0] - a[0]);
  return {
    skyTop: mixHex(a[1], b[1], t),
    horizon: mixHex(a[2], b[2], t),
    light: mixHex(a[3], b[3], t),
    intensity: a[4] + (b[4] - a[4]) * t,
  };
}

export function mixHex(x, y, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(x), [r2, g2, b2] = p(y);
  const c = (u, v) => Math.round(u + (v - u) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

export function parsePinnedTime(search) {
  const m = new URLSearchParams(search).get('t')?.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const v = +m[1] * 60 + +m[2];
  return v >= 0 && v < 1440 ? v : null;
}
