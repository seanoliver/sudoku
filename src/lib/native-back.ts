/** iOS build: the native left-edge swipe drives these. The current screen follows the finger over the screen it returns to, then either finishes and presses the screen's back control, or springs back. */
type SwipePhase = 'start' | 'move' | 'end' | 'cancel';

const SETTLE_MS = 280;
const SETTLE = `transform ${SETTLE_MS}ms cubic-bezier(.2, .8, .2, 1)`;
const CHANGE_TIMEOUT_MS = 600;

/** Whether a released swipe goes back: a rightward flick, or past 35% of the width unless flicked back left. */
export function finishesSwipe({ offset, width, speed }: { offset: number; width: number; speed: number }) {
  return speed > 500 || (offset > width * 0.35 && speed > -500);
}

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
  const pressBack = (done: () => void) => {
    const control = backControl();
    if (!control) { done(); return; }
    control.click();
    const started = performance.now();
    const check = () => { if (!control.isConnected || performance.now() - started > CHANGE_TIMEOUT_MS) done(); else requestAnimationFrame(check); };
    requestAnimationFrame(check);
  };
  let state: 'idle' | 'dragging' | 'settling' = 'idle';
  const win = window as unknown as { sudokuSwipe: (phase: SwipePhase, x: number, speed: number) => void };
  win.sudokuSwipe = (phase, x, speed) => {
    if (phase === 'start') {
      if (state !== 'idle' || document.querySelector('dialog.sheet[open]') || !backControl()) return;
      state = 'dragging';
      current()?.classList.add('swiping');
      onSwiping(true);
      return;
    }
    if (state !== 'dragging') return;
    const offset = Math.max(0, x);
    if (phase === 'move') { place(offset, 'none'); return; }
    state = 'settling';
    const finish = phase === 'end' && finishesSwipe({ offset, width: innerWidth, speed });
    place(finish ? innerWidth : 0, SETTLE);
    setTimeout(() => {
      const end = () => { onSwiping(false); reset(); state = 'idle'; };
      if (finish) pressBack(end); else end();
    }, SETTLE_MS);
  };
}
