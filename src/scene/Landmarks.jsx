import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mixHex } from '../lib/time.js';

// Original, generic shapes: a tiered castle keep silhouette on a far ridge, and a torii down the slope.
function castleShape() {
  const s = new THREE.Shape();
  const tier = (w, y, h) => { s.moveTo(-w, y); s.lineTo(w, y); s.lineTo(w * 0.7, y + h); s.lineTo(-w * 0.7, y + h); s.lineTo(-w, y); };
  s.moveTo(-4, 0); s.lineTo(4, 0); s.lineTo(4, 3); s.lineTo(-4, 3); s.lineTo(-4, 0);
  tier(4.6, 3, 1); tier(3.6, 4.2, 0.9); tier(2.7, 5.3, 0.8); tier(1.9, 6.3, 0.9);
  return s;
}

export default function Landmarks({ world }) {
  const castleMat = useRef();
  const castle = useMemo(() => new THREE.ShapeGeometry(castleShape()), []);
  useFrame(() => {
    const w = world.current;
    castleMat.current.color.set(mixHex(mixHex('#3d4a3a', '#141a2a', w.night * 0.8), w.pal.horizon, 0.7));
  });
  return (
    <group>
      {/* Sits between ridge 1 (behind) and ridge 2 (in front) so its base is hidden in the haze. */}
      <mesh geometry={castle} position={[48, 2, -118]} scale={1.15} renderOrder={1}>
        <meshBasicMaterial ref={castleMat} transparent depthWrite={false} fog={false} />
      </mesh>
      <group position={[-6.5, -2.7, -14]} rotation={[0, 0.35, 0]} scale={0.9}>
        {[-1.4, 1.4].map((x) => (
          <mesh key={x} position={[x, 1.6, 0]}><cylinderGeometry args={[0.13, 0.16, 3.2, 10]} /><meshStandardMaterial color="#8a2c22" roughness={0.7} /></mesh>
        ))}
        <mesh position={[0, 3.3, 0]}><boxGeometry args={[4.2, 0.22, 0.3]} /><meshStandardMaterial color="#1e1a18" roughness={0.6} /></mesh>
        <mesh position={[0, 2.75, 0]}><boxGeometry args={[3.4, 0.16, 0.18]} /><meshStandardMaterial color="#8a2c22" roughness={0.7} /></mesh>
      </group>
    </group>
  );
}
