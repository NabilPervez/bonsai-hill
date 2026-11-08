import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// G5 pattern (full-screen shader) adapted to a back-face sky dome: gradient + sun/moon glow + soft cloud noise.
const vert = /* glsl */ `
varying vec3 vDir;
void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`;
const frag = /* glsl */ `
uniform vec3 uTop, uHorizon, uSunDir, uMoonDir, uSunCol;
uniform float uNight, uTime;
varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.05, 0.6, h), 0.7));
  float s = max(dot(d, uSunDir), 0.0);
  col += uSunCol * (pow(s, 900.0) * 3.0 + pow(s, 24.0) * 0.35) * (1.0 - uNight * 0.9);
  float m = max(dot(d, uMoonDir), 0.0);
  col += vec3(0.85,0.9,1.0) * (smoothstep(0.9994, 0.9997, m) + pow(m, 60.0) * 0.15) * uNight;
  // Stars + faint band
  vec2 sp = d.xz / max(d.y, 0.05) * 60.0;
  float st = step(0.9965, hash(floor(sp))) * smoothstep(0.05, 0.3, d.y);
  float band = fbm(d.xz * 3.0 + 4.0) * smoothstep(0.35, 0.0, abs(d.x * 0.6 + d.z * 0.4 - 0.1));
  col += (vec3(st) * (0.6 + 0.4 * sin(uTime * 2.0 + hash(floor(sp)) * 40.0)) + band * 0.08) * uNight;
  // Clouds: soft drifting fbm layer
  vec2 cp = d.xz / max(d.y + 0.15, 0.08) * 1.4 + vec2(uTime * 0.004, 0.0);
  float c = smoothstep(0.55, 0.85, fbm(cp)) * smoothstep(0.0, 0.25, d.y);
  vec3 cc = mix(uHorizon * 1.05, uSunCol, 0.25) * (1.0 - uNight * 0.75);
  col = mix(col, cc, c * 0.55);
  gl_FragColor = vec4(col, 1.0);
}`;

export default function Sky({ world }) {
  const mat = useRef();
  const uniforms = useMemo(() => ({
    uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3() }, uMoonDir: { value: new THREE.Vector3() },
    uNight: { value: 0 }, uTime: { value: 0 },
  }), []);
  useFrame((s) => {
    const w = world.current, u = uniforms;
    u.uTop.value.set(w.pal.skyTop); u.uHorizon.value.set(w.pal.horizon); u.uSunCol.value.set(w.pal.light);
    u.uSunDir.value.copy(w.sun).normalize(); u.uMoonDir.value.copy(w.moon).normalize();
    u.uNight.value = w.night; u.uTime.value = s.clock.elapsedTime;
  });
  return (
    <mesh renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[300, 48, 24]} />
      <shaderMaterial ref={mat} side={THREE.BackSide} depthWrite={false} fog={false} uniforms={uniforms} vertexShader={vert} fragmentShader={frag} />
    </mesh>
  );
}
