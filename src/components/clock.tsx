'use client';
import { useEffect, useRef, useState } from 'react';
const KEY = 'sudoku.clock.v1';
export function Clock({ id, running, resetRevision = 0 }: { id: string; running: boolean; resetRevision?: number }) {
  const [seconds, setSeconds] = useState(0);
  const lastReset = useRef(resetRevision);
  useEffect(() => {
    const resetting = lastReset.current !== resetRevision;
    lastReset.current = resetRevision;
    let elapsed = 0;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (!resetting && saved?.id === id && Number.isFinite(saved.seconds) && saved.seconds >= 0) elapsed = saved.seconds;
    } catch { /* A damaged clock never prevents playing. */ }
    let started = performance.now();
    let visible = !document.hidden;
    const current = () => elapsed + (running && visible ? (performance.now() - started) / 1000 : 0);
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ id, seconds: current() })); } catch { /* Game handles storage warning. */ } };
    // Previous effect cleanup saves first; this write resets the same puzzle clock afterward.
    if (resetting) save();
    const visibility = () => {
      elapsed = current(); started = performance.now(); visible = !document.hidden;
      save(); setSeconds(Math.floor(elapsed));
    };
    const initial = window.setTimeout(() => setSeconds(Math.floor(elapsed)), 0);
    const interval = window.setInterval(() => { setSeconds(Math.floor(current())); save(); }, 1000);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', save);
    return () => { save(); clearTimeout(initial); clearInterval(interval); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', save); };
  }, [id, running, resetRevision]);
  const minutes = Math.floor(seconds / 60);
  return <span className="clock" aria-label={`Time played: ${minutes} minutes ${seconds % 60} seconds`}>{minutes.toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')}</span>;
}
