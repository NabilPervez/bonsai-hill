import { useEffect, useRef, useState } from 'react';
import { sceneMinutes, parsePinnedTime } from '../lib/time.js';

export function useReducedMotion() {
  const q = '(prefers-reduced-motion: reduce)';
  const [reduced, set] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    const mq = matchMedia(q);
    const on = () => set(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export function usePageVisible() {
  const [visible, set] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const on = () => set(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

// Idle after 2 min without input → caller drops to 30 fps.
export function useIdle(ms = 120000) {
  const [idle, set] = useState(false);
  useEffect(() => {
    let id;
    const reset = () => { set(false); clearTimeout(id); id = setTimeout(() => set(true), ms); };
    const evs = ['pointermove', 'keydown', 'wheel', 'touchstart'];
    evs.forEach((e) => addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(id); evs.forEach((e) => removeEventListener(e, reset)); };
  }, [ms]);
  return idle;
}

// Returns a ref holding current scene minutes; override via ?t=HH:MM or setOverride (debug slider).
export function useSceneClock() {
  const start = useRef(new Date());
  const pinned = useRef(typeof location !== 'undefined' ? parsePinnedTime(location.search) : null);
  const ref = useRef(0);
  const get = () => (pinned.current ?? sceneMinutes(start.current, Date.now()));
  ref.current = get();
  return {
    minutesRef: ref,
    tick: () => (ref.current = get()),
    setOverride: (m) => (pinned.current = m),
  };
}
