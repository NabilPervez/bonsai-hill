import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mixHex } from '../lib/time.js';

// Painted ridge cards: tall planes reaching well below the horizon (no sky gaps), noise-cut top edge,
// tinted toward the horizon color with distance (aerial perspective).
const frag = /* glsl */ `
uniform vec3 uCol, uHaze; uniform float uSeed, uLow, uHigh;
varying vec2 vUv;
float hash(float n){ return fract(sin(n)*43758.5453); }
float noise(float x){ float i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(hash(i+uSeed),hash(i+1.+uSeed),f); }
void main(){
  float x = vUv.x * 7.0;
  float n = noise(x)*0.6 + noise(x*2.3)*0.28 + noise(x*6.1)*0.12;
  float ridge = mix(uLow, uHigh, n);
  float a = smoothstep(ridge, ridge - 0.004, vUv.y);
  if (a < 0.01) discard;
  // Mist pooling at the base of each ridge
  float mist = smoothstep(ridge - 0.04, ridge - 0.25, vUv.y);
  gl_FragColor = vec4(mix(uCol, uHaze, mist * 0.45), a);
}`;
const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;

const BOTTOM = -60;
// low/high = world-space y range of the ridge line for each card.
const LAYERS = [
  { z: -170, w: 700, low: 6, high: 22, seed: 3.1, mix: 0.8 },
  { z: -120, w: 520, low: 0, high: 12, seed: 7.7, mix: 0.6 },
  { z: -80, w: 380, low: -4, high: 4, seed: 12.4, mix: 0.4 },
  { z: -48, w: 260, low: -6, high: -1.5, seed: 19.9, mix: 0.22 },
];
const BASE = '#3d4a3a';

export default function Ridges({ world }) {
  const items = useMemo(() => LAYERS.map((l) => {
    const h = l.high - BOTTOM + 2;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uCol: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uSeed: { value: l.seed },
        uLow: { value: (l.low - BOTTOM) / h }, uHigh: { value: (l.high - BOTTOM) / h },
      },
      vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
    });
    return { ...l, h, mat };
  }), []);
  useFrame(() => {
    const w = world.current;
    const dark = mixHex(BASE, '#141a2a', w.night * 0.8);
    items.forEach((l) => {
      l.mat.uniforms.uCol.value.set(mixHex(dark, w.pal.horizon, l.mix));
      l.mat.uniforms.uHaze.value.set(w.pal.horizon);
    });
  });
  return items.map((l, i) => (
    <mesh key={i} position={[0, BOTTOM + l.h / 2, l.z]} material={l.mat} renderOrder={i * 2}>
      <planeGeometry args={[l.w, l.h]} />
    </mesh>
  ));
}
