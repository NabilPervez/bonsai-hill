import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Sky from './Sky.jsx';
import Hill from './Hill.jsx';
import Ridges from './Ridges.jsx';
import Landmarks from './Landmarks.jsx';
import { paletteAt, sunPosition, moonPosition } from '../lib/time.js';

// Shared per-frame world state, read by children via ref (no React re-renders per frame).
export default function Scene({ clock, reduced, idle }) {
  const { scene, invalidate, camera } = useThree();
  const world = useRef({ minutes: clock.minutesRef.current, pal: paletteAt(clock.minutesRef.current), sun: new THREE.Vector3(), moon: new THREE.Vector3(), night: 0 });
  const sunLight = useRef();
  const hemi = useRef();
  const fog = useMemo(() => new THREE.Fog('#c9b8b0', 18, 140), []);
  const tmp = useMemo(() => new THREE.Color(), []);

  useEffect(() => { scene.fog = fog; return () => { scene.fog = null; }; }, [scene, fog]);

  // Idle (2 min) → ~30 fps by driving 'demand' loop manually. Reduced motion → one frame per update.
  useEffect(() => {
    if (reduced) { invalidate(); return; }
    if (!idle) return;
    const id = setInterval(() => invalidate(), 33);
    return () => clearInterval(id);
  });

  useFrame((state) => {
    const m = clock.tick();
    const w = world.current;
    w.minutes = m;
    w.pal = paletteAt(m);
    const s = sunPosition(m), mo = moonPosition(m);
    // Arc across the sky behind the scene (south = -z).
    w.sun.set(Math.cos(s.angle) * -90, Math.sin(s.angle) * 70 - 8, -120);
    w.moon.set(Math.cos(mo.angle) * -90, Math.sin(mo.angle) * 70 - 8, -120);
    w.night = THREE.MathUtils.clamp(-s.elevation * 3 + 0.3, 0, 1);

    const lit = s.elevation > -0.05;
    sunLight.current.position.copy(lit ? w.sun : w.moon).normalize().multiplyScalar(40);
    sunLight.current.color.set(w.pal.light);
    sunLight.current.intensity = w.pal.intensity * 3.2;
    hemi.current.color.set(w.pal.skyTop);
    hemi.current.groundColor.set(w.pal.horizon);
    hemi.current.intensity = 0.9 + w.pal.intensity * 1.1;
    fog.color.copy(tmp.set(w.pal.horizon));

    // Gentle hold on the S1 framing; camera director arrives in S4.
    if (!reduced) {
      const t = state.clock.elapsedTime;
      camera.position.x = Math.sin(t * 0.05) * 0.15;
      camera.position.y = 1.6 + Math.sin(t * 0.07) * 0.05;
    }
    // Portrait (phones): wider lens so the hero fits; S5 adds the proper locked phone shot.
    const fov = state.size.width < state.size.height ? 58 : 38;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.lookAt(0, 1.4, 0);
  });

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight ref={sunLight} />
      <Sky world={world} />
      <Ridges world={world} />
      <Landmarks world={world} />
      <Hill />
    </>
  );
}
