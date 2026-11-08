import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { generateBonsai, placeLeaves, rng, SOIL_Y } from '../lib/bonsai.js';

const SEED = 7;
const BARK_A = new THREE.Color('#4e3d30');
const BARK_B = new THREE.Color('#857463');
const MOSS = new THREE.Color('#5d7a34');

// Tapered tube along a curve, with flutes (bark ridges) and per-vertex bark/moss color.
function taperTube(seg, rand) {
  const curve = new THREE.CatmullRomCurve3(seg.points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const big = seg.kind === 'trunk';
  const tub = big ? 64 : 18, rad = big ? 20 : 9;
  const frames = curve.computeFrenetFrames(tub, false);
  const len = curve.getLength();
  const pos = [], nor = [], uv = [], col = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3(), c = new THREE.Color();
  const phase = rand() * 10;
  for (let i = 0; i <= tub; i++) {
    const t = i / tub;
    curve.getPointAt(t, P);
    let r = seg.r0 + (seg.r1 - seg.r0) * Math.pow(t, 0.75);
    if (seg.flare) r *= 1 + 0.85 * Math.pow(1 - t, 7);
    for (let j = 0; j <= rad; j++) {
      const v = (j / rad) * Math.PI * 2;
      N.copy(frames.normals[i]).multiplyScalar(-Math.cos(v)).addScaledVector(frames.binormals[i], Math.sin(v)).normalize();
      const flute = big ? 1 + 0.07 * Math.sin(v * 5 + t * 7 + phase) + 0.03 * Math.sin(v * 13 - t * 23) : 1 + 0.04 * Math.sin(v * 4 + t * 5);
      pos.push(P.x + N.x * r * flute, P.y + N.y * r * flute, P.z + N.z * r * flute);
      nor.push(N.x, N.y, N.z);
      uv.push(j / rad, t * len * 1.6);
      const n = 0.5 + 0.5 * Math.sin(v * 3.1 + t * 17 + phase) * Math.cos(t * 9 - v * 2);
      c.copy(BARK_A).lerp(BARK_B, Math.pow(n, 1.6));
      // Moss on upward faces low on the trunk and roots
      const mossy = (seg.kind === 'root' || (big && t < 0.18)) ? Math.max(0, N.y) * (seg.kind === 'root' ? 0.9 : 1 - t / 0.18) : 0;
      c.lerp(MOSS, Math.min(1, mossy * 1.3));
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < tub; i++) for (let j = 0; j < rad; j++) {
    const a = i * (rad + 1) + j, b = a + rad + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

// Bark detail: vertical streaks + speckle, used as a bump map.
function barkTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const x = cv.getContext('2d'); const r = rng(11);
  x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    const px = r() * 256, w = 1 + r() * 3, l = 20 + r() * 90, py = r() * 256, g = Math.floor(70 + r() * 110);
    x.fillStyle = `rgb(${g},${g},${g})`; x.fillRect(px, py, w, l); x.fillRect(px, py - 256, w, l);
  }
  for (let i = 0; i < 1500; i++) { const g = Math.floor(r() * 255); x.fillStyle = `rgba(${g},${g},${g},.35)`; x.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 0.7);
  return t;
}

// Japanese maple leaf: 5 pointed lobes, drawn once into a canvas (alpha + veins).
function leafTexture() {
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d');
  x.translate(S / 2, S * 0.62);
  x.beginPath();
  for (let i = 0; i <= 360; i++) {
    const th = (i / 360) * Math.PI * 2;
    const a = th - Math.PI / 2; // lobe 0 points up
    const lobe = Math.pow(Math.abs(Math.cos(a * 2.5 + Math.PI / 2 * 0)), 3);
    const bottom = Math.max(0, Math.sin(th)) ; // shorten the downward lobes
    const rr = S * (0.16 + 0.34 * lobe) * (1 - 0.55 * bottom * bottom);
    const px = Math.cos(th) * rr, py = -Math.sin(th) * rr;
    i ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.closePath(); x.fillStyle = '#fff'; x.fill();
  x.strokeStyle = 'rgba(150,150,150,.8)'; x.lineWidth = 1.2;
  for (let k = 0; k < 5; k++) { const th = Math.PI / 2 + (k - 2) * (Math.PI * 2 / 5); x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(th) * S * 0.42, -Math.sin(th) * S * 0.42); x.stroke(); }
  x.strokeStyle = '#7a7a7a'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, S * 0.3); x.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function potGeometry() {
  const w = 0.95, d = 0.6, rr = 0.12;
  const s = new THREE.Shape();
  s.moveTo(-w + rr, -d); s.lineTo(w - rr, -d); s.quadraticCurveTo(w, -d, w, -d + rr);
  s.lineTo(w, d - rr); s.quadraticCurveTo(w, d, w - rr, d); s.lineTo(-w + rr, d);
  s.quadraticCurveTo(-w, d, -w, d - rr); s.lineTo(-w, -d + rr); s.quadraticCurveTo(-w, -d, -w + rr, -d);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); // extrude now goes up
  g.translate(0, 0.2, 0);
  const soil = new THREE.ShapeGeometry(s, 6); soil.rotateX(-Math.PI / 2); soil.scale(0.94, 1, 0.92); soil.translate(0, SOIL_Y - 0.015, 0);
  return { pot: g, soil };
}

export default function Bonsai() {
  const { trunkGeo, leaves, pads, barkMap, leafMap, pot, soil, moss } = useMemo(() => {
    const tree = generateBonsai(SEED);
    const r = rng(SEED + 1);
    const trunkGeo = mergeGeometries(tree.segments.map((s) => taperTube(s, r)));
    const leaves = placeLeaves(tree.pads, SEED, 1300);
    const pads = tree.pads;
    const r2 = rng(99);
    const moss = Array.from({ length: 40 }, () => ({ x: (r2() - 0.5) * 1.6, z: (r2() - 0.5) * 0.95, s: 0.04 + r2() * 0.07, k: r2() }))
      .filter((m) => Math.hypot(m.x, m.z) > 0.3);
    return { trunkGeo, leaves, pads, barkMap: barkTexture(), leafMap: leafTexture(), ...potGeometry(), moss };
  }, []);

  const leafMesh = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.38, 0);
    const m = new THREE.MeshStandardMaterial({ map: leafMap, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.65, metalness: 0 });
    // Fake translucency: back faces glow slightly with the light color.
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * (gl_FrontFacing ? 0.06 : 0.22);');
    };
    const mesh = new THREE.InstancedMesh(g, m, leaves.length);
    const o = new THREE.Object3D(), c = new THREE.Color();
    const greens = ['#4f7a2e', '#5f8c34', '#6e9a3c', '#466d29', '#7aa645'].map((h) => new THREE.Color(h));
    leaves.forEach((l, i) => {
      o.position.set(...l.pos); o.rotation.set(l.pitch, l.yaw, l.roll, 'YXZ'); o.scale.setScalar(l.size); o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      if (l.tone < 0.04) c.set('#b9a646'); else c.copy(greens[Math.floor(l.tone * 997) % greens.length]);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }, [leaves, leafMap]);

  useEffect(() => () => {
    [trunkGeo, pot, soil, leafMesh.geometry].forEach((g) => g.dispose());
    [barkMap, leafMap].forEach((t) => t.dispose());
    leafMesh.material.dispose(); leafMesh.dispose();
  }, [trunkGeo, pot, soil, leafMesh, barkMap, leafMap]);

  return (
    <group>
      <mesh geometry={trunkGeo}>
        <meshStandardMaterial vertexColors bumpMap={barkMap} bumpScale={5} roughness={0.95} />
      </mesh>
      <primitive object={leafMesh} />
      {/* Inner foliage volume: dark core so gaps between leaf cards read as shadowed canopy, not sky. */}
      {pads.map((p, i) => (
        <mesh key={'v' + i} position={[p.c[0], p.c[1] + p.ry * 0.05, p.c[2]]} scale={[p.rx * 0.6, p.ry * 0.5, p.rx * 0.5]}>
          <icosahedronGeometry args={[1, 3]} />
          <meshStandardMaterial color="#2e4a1c" roughness={1} />
        </mesh>
      ))}
      <mesh geometry={pot}>
        <meshPhysicalMaterial color="#1d3a44" roughness={0.28} clearcoat={0.6} clearcoatRoughness={0.25} />
      </mesh>
      <mesh geometry={soil}>
        <meshStandardMaterial color="#2c2a22" roughness={1} />
      </mesh>
      {moss.map((m, i) => (
        <mesh key={i} position={[m.x, SOIL_Y - 0.02, m.z]} scale={[m.s, m.s * 0.4, m.s * 0.9]}>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color={m.k > 0.5 ? '#4d6a28' : '#5e7a33'} roughness={1} flatShading />
        </mesh>
      ))}
      {/* Feet */}
      {[[-0.75, -0.42], [0.75, -0.42], [-0.75, 0.42], [0.75, 0.42]].map(([x, z], i) => (
        <mesh key={'f' + i} position={[x, 0.2, z]}><boxGeometry args={[0.16, 0.08, 0.12]} /><meshStandardMaterial color="#16282e" roughness={0.4} /></mesh>
      ))}
    </group>
  );
}
