/** iOS build: the native left-edge swipe drives these. The current screen follows the finger over the screen it returns to, then either finishes and presses the screen's back control, or springs back. */
type SwipePhase = 'start' | 'move' | 'end' | 'cancel';

const FINISH_FRACTION = 0.35;
const FINISH_SPEED = 500;
const SETTLE = 'transform 280ms cubic-bezier(.2, .8, .2, 1)';

export function installNativeBack(onSwiping: (active: boolean) => void) {
  if (process.env.NEXT_PUBLIC_BUILD_TARGET !== 'ios') return;
  const current = () => document.querySelector<HTMLElement>('.app:not(.swipe-under)');
  const under = () => document.querySelector<HTMLElement>('.swipe-under');
  const backControl = () => current()?.querySelector<HTMLButtonElement>('.lesson-back, .game-bar .home-button:not(:disabled)') ?? null;
  const place = (x: number, transition: string) => {
    const screen = current(), below = under(), width = innerWidth;
    if (screen) { screen.style.transition = transition; screen.style.transform = `translateX(${x}px)`; }
    if (below) { below.style.transition = transition; below.style.transform = `translateX(${(x - width) * 0.3}px)`; below.style.setProperty('--swipe-dim', String(0.12 * (1 - x / width))); }
  };
  const reset = () => { const screen = current(); if (screen) { screen.style.transition = ''; screen.style.transform = ''; screen.classList.remove('swiping'); } };
  let active = false;
  const win = window as unknown as { sudokuSwipe: (phase: SwipePhase, x: number, speed: number) => void };
  win.sudokuSwipe = (phase, x, speed) => {
    if (phase === 'start') {
      active = !document.querySelector('dialog.sheet[open]') && Boolean(backControl());
      if (!active) return;
      current()?.classList.add('swiping');
      onSwiping(true);
      return;
    }
    if (!active) return;
    const offset = Math.max(0, x);
    if (phase === 'move') { place(offset, 'none'); return; }
    active = false;
    const finish = phase === 'end' && (offset > innerWidth * FINISH_FRACTION || speed > FINISH_SPEED);
    place(finish ? innerWidth : 0, SETTLE);
    setTimeout(() => {
      if (finish) backControl()?.click();
      onSwiping(false);
      requestAnimationFrame(reset);
    }, 280);
  };
}
