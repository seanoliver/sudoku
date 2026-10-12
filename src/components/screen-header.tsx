'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './icons';

export function ScreenHeader({ title, subtitle, back, size, onExit }: { title: string; subtitle?: ReactNode; back: string; size: 'large' | 'compact'; onExit: () => void }) {
  const row = useRef<HTMLElement>(null);
  const large = useRef<HTMLHeadingElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const heading = large.current;
    if (!heading || !row.current) return;
    const observer = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), { rootMargin: `-${row.current.offsetHeight}px 0px 0px 0px` });
    observer.observe(heading);
    return () => observer.disconnect();
  }, []);
  // The row and the large title are siblings, so the row can stick for the whole screen while the title scrolls away.
  return <>
    <header ref={row} className={`screen-nav ${size}`} data-collapsed={size === 'compact' || collapsed}>
      {/* `lesson-back` is the control the iOS swipe-back presses. */}
      <button className="screen-back lesson-back" onClick={onExit}><Icon name="chevron" size={16}/><span>{back}</span></button>
      <div className="screen-compact-title" aria-hidden={size === 'large'}>
        {size === 'compact' ? <h1>{title}</h1> : <strong>{title}</strong>}
        {subtitle && <small>{subtitle}</small>}
      </div>
    </header>
    {size === 'large' && <div className="screen-large"><h1 ref={large}>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>}
  </>;
}
