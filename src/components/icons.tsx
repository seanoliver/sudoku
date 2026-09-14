import type { CSSProperties } from 'react';
export type IconName = 'undo' | 'erase' | 'pencil' | 'pause' | 'play' | 'plus' | 'chevron' | 'settings' | 'download' | 'check' | 'close' | 'help' | 'sun' | 'moon';
const paths: Record<IconName, React.ReactNode> = {
  undo: <><path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12" transform="translate(0 -2)" /></>,
  erase: <><path d="m14 3 7 7-10 10H6l-4-4L14 3Z"/><path d="m8 10 7 7M11 20h10"/></>,
  pencil: <><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0 0-3l-1-1a2 2 0 0 0-3 0L5 15l-1 5Z"/></>,
  pause: <><path d="M8 5v14M16 5v14" strokeWidth="3"/></>,
  play: <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  chevron: <path d="m7 10 5 5 5-5"/>,
  settings: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--surface)"/><circle cx="16" cy="17" r="3" fill="var(--surface)"/></>,
  download: <><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.7c-1.3.7-1.8 1.1-1.8 2.8M12 17h.01"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  moon: <path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>,
};
export function Icon({ name, size = 22, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
export function AppMark({ small = false }: { small?: boolean }) {
  return <span className={`app-mark ${small ? 'small' : ''}`} aria-hidden="true"><i/><i/><i/><i/></span>;
}
