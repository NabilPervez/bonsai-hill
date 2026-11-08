import { useMemo } from 'react';
import * as THREE from 'three';

// Hilltop: displaced disc that falls away toward the valley. Pot + stone stand in until S2's procedural bonsai.
export default function Hill() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(120, 120, 120, 120);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const r = Math.hypot(x, z * 0.8);
      const fall = -Math.pow(Math.max(r - 4, 0) / 10, 1.6) * 3.2;
      const bumps = Math.sin(x * 0.35) * Math.cos(z * 0.27) * 0.25 + Math.sin(x * 1.3 + z * 0.9) * 0.05;
      p.setY(i, fall + bumps);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial color="#56663c" roughness={0.95} />
      </mesh>
      {/* Stone slab + pot placeholder (S2 replaces with the procedural tree) */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[1.25, 1.35, 0.18, 9]} />
        <meshStandardMaterial color="#4a4a44" roughness={1} />
      </mesh>
    </group>
  );
}
