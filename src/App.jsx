import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion, usePageVisible, useIdle, useSceneClock } from './hooks/index.js';
import Scene from './scene/Scene.jsx';
import { phaseOf } from './lib/time.js';

const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

export default function App() {
  const reduced = useReducedMotion();
  const visible = usePageVisible();
  const idle = useIdle();
  const clock = useSceneClock();
  const debug = new URLSearchParams(location.search).has('debug');
  const [now, setNow] = useState(new Date());
  const [dbg, setDbg] = useState(Math.round(clock.minutesRef.current));

  // Real local clock (always on).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  // Reduced motion: static frame, re-render once a minute so time of day still moves.
  const [, bump] = useState(0);
  useEffect(() => {
    if (!reduced) return;
    const id = setInterval(() => bump((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, [reduced]);

  const onCreated = () => requestAnimationFrame(() => {
    const s = document.getElementById('still');
    if (s) s.style.opacity = '0';
  });

  // Hidden tab → never render. Reduced motion → render on demand only.
  const frameloop = !visible ? 'never' : reduced || idle ? 'demand' : 'always';

  return (
    <>
      <Canvas
        frameloop={frameloop}
        dpr={[1, 1.75]}
        camera={{ fov: 38, position: [0, 1.6, 7], near: 0.1, far: 400 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={onCreated}
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100dvh' }}
      >
        <Suspense fallback={null}>
          <Scene clock={clock} reduced={reduced} idle={idle} />
        </Suspense>
      </Canvas>
      <div className="clock" aria-label="Local time">{fmt(now.getHours() * 60 + now.getMinutes())}</div>
      {debug && (
        <label className="debug">
          {fmt(dbg)} · {phaseOf(dbg)}
          <input type="range" min="0" max="1439" value={dbg}
            onChange={(e) => { const v = +e.target.value; setDbg(v); clock.setOverride(v); }} />
        </label>
      )}
    </>
  );
}
