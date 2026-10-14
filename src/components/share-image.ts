import type { Earned } from '@/lib/accomplishments';
import type { Difficulty } from '@/lib/sudoku';

export const SHARE_SIZE = 1080;
const S = SHARE_SIZE / 360;
const LEVELS: readonly Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
// Copies of the flame, flag, and gem paths in icons.tsx. Change both together.
const ICON_PATHS: Record<Earned['kind'], string[]> = {
  streak: ['M12 2.5c.6 3.6 6.5 6 6.5 12a6.5 6.5 0 0 1-13 0c0-3 1.6-5.2 3.2-6.3.1 2.2.9 3.5 2.1 4.2C10.6 9 11.2 5.6 12 2.5Z', 'M12 21a2.6 2.6 0 0 1-2.6-2.6c0-1.6 1.3-2.6 2.6-4.4 1.3 1.8 2.6 2.8 2.6 4.4A2.6 2.6 0 0 1 12 21Z'],
  first: ['M5 21V4', 'M5 4h11l-2 4 2 4H5'],
  clean: ['M7 4h10l4 5-9 11L3 9l4-5Z', 'M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5'],
};

export type SharePalette = { level: string; levelSoft: string; canvas: string; surface: string; ink: string; secondary: string; line: string; boxLine: string };
export function paletteOf(element: Element): SharePalette {
  const style = getComputedStyle(element);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return { level: read('--level'), levelSoft: read('--level-soft'), canvas: read('--canvas'), surface: read('--surface'), ink: read('--ink'), secondary: read('--secondary'), line: read('--line'), boxLine: read('--box-line') };
}

const rgb = (hex: string) => { const n = parseInt(hex.replace('#', '').slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
/** `a` mixed into `b`, `t` from 0 (all `b`) to 1 (all `a`), like CSS `color-mix(in srgb, a t, b)`. */
const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, k) => Math.round(v * t + y[k] * (1 - t))).join(',')})`; };
const levelName = (level: Difficulty) => level[0].toUpperCase() + level.slice(1);
const shortTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
export const earnedText = (earned: Earned) => earned.kind === 'streak' ? `${earned.days} days` : earned.kind === 'first' ? 'First solve' : 'Clean';
export const longDay = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); };

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.roundRect(x, y, w, h, r);
}
function drawIcon(g: CanvasRenderingContext2D, kind: Earned['kind'], x: number, y: number, size: number, color: string) {
  g.save(); g.translate(x, y); g.scale(size / 24, size / 24);
  g.strokeStyle = color; g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const d of ICON_PATHS[kind]) g.stroke(new Path2D(d));
  g.restore();
}
function drawMark(g: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const fill = g.createLinearGradient(x, y, x + size * .4, y + size);
  fill.addColorStop(0, '#3b3f8f'); fill.addColorStop(.6, '#232663'); fill.addColorStop(1, '#15173d');
  roundRect(g, x, y, size, size, size * .24); g.fillStyle = fill; g.fill();
  const pad = size * .2, gap = size * .07, cell = (size - 2 * pad - 2 * gap) / 3;
  for (let k = 0; k < 9; k++) {
    roundRect(g, x + pad + (k % 3) * (cell + gap), y + pad + Math.floor(k / 3) * (cell + gap), cell, cell, cell * .2);
    g.fillStyle = k === 4 ? '#ffc94d' : 'rgba(199,203,255,.28)'; g.fill();
  }
}

export function drawShareImage(canvas: HTMLCanvasElement, { level, order, seconds, day, earned, palette: p }: { level: Difficulty; order: readonly (number | null)[]; seconds: number | null; day: string | null; earned: Earned | null; palette: SharePalette }) {
  canvas.width = canvas.height = SHARE_SIZE;
  const g = canvas.getContext('2d');
  if (!g) return;
  const glow = g.createRadialGradient(SHARE_SIZE / 2, SHARE_SIZE * .46, 0, SHARE_SIZE / 2, SHARE_SIZE * .46, SHARE_SIZE * .72);
  glow.addColorStop(0, mix(p.level, p.canvas, .16)); glow.addColorStop(1, p.canvas);
  g.fillStyle = glow; g.fillRect(0, 0, SHARE_SIZE, SHARE_SIZE);
  g.textBaseline = 'middle';

  const top = 26 * S, left = 26 * S, right = SHARE_SIZE - 26 * S;
  drawMark(g, left, top, 29 * S);
  g.fillStyle = p.ink; g.font = `650 ${17 * S}px ${FONT}`; g.textAlign = 'left';
  g.fillText('Sudoclue', left + 38 * S, top + 14.5 * S);
  if (earned) {
    g.font = `650 ${13 * S}px ${FONT}`;
    const text = earnedText(earned), width = g.measureText(text).width + 41 * S, h = 29 * S;
    roundRect(g, right - width, top, width, h, h / 2); g.fillStyle = p.levelSoft; g.fill();
    drawIcon(g, earned.kind, right - width + 11 * S, top + 7.5 * S, 14 * S, p.level);
    g.fillStyle = p.level; g.fillText(text, right - width + 30 * S, top + h / 2);
  }

  const gap = 3 * S, boxGap = 7 * S, map = 200 * S;
  const cell = (map - 6 * gap - 2 * boxGap) / 9;
  const mapTop = 80 * S, mapLeft = (SHARE_SIZE - map) / 2;
  const offset = (k: number) => k * (cell + gap) + Math.floor(k / 3) * (boxGap - gap);
  order.forEach((rank, i) => {
    const x = mapLeft + offset(i % 9), y = mapTop + offset(Math.floor(i / 9));
    roundRect(g, x, y, cell, cell, 5 * S);
    if (rank === null) {
      g.fillStyle = p.surface; g.fill(); g.strokeStyle = p.line; g.lineWidth = S; g.stroke();
      g.beginPath(); g.arc(x + cell / 2, y + cell / 2, 3 * S, 0, Math.PI * 2); g.fillStyle = p.boxLine; g.fill();
    } else { g.fillStyle = mix(p.level, p.canvas, .22 + .78 * rank); g.fill(); }
  });

  if (day) {
    g.fillStyle = p.secondary; g.font = `650 ${14 * S}px ${FONT}`; g.textAlign = 'left';
    g.fillText(`Daily · ${longDay(day)}`, left, 63 * S);
  }
  const foot = 308 * S;
  if (seconds !== null) { g.fillStyle = p.ink; g.font = `700 ${36 * S}px ${FONT}`; g.textAlign = 'left'; g.fillText(shortTime(seconds), left, foot); }
  g.font = `650 ${15 * S}px ${FONT}`; g.textAlign = 'right'; g.fillStyle = p.secondary;
  const name = levelName(level), nameWidth = g.measureText(name).width;
  const tilesRight = seconds === null ? SHARE_SIZE / 2 + (nameWidth + 34 * S) / 2 : right;
  g.fillText(name, tilesRight, foot);
  // The same lighting order as Home's level tiles. Change both together.
  const lit = 2 + LEVELS.indexOf(level) * 2, tile = 8 * S, tileGap = 2 * S;
  const tilesLeft = tilesRight - nameWidth - 8 * S - (3 * tile + 2 * tileGap);
  [0, 4, 8, 2, 6, 1, 3, 5, 7].forEach((k, n) => {
    roundRect(g, tilesLeft + (k % 3) * (tile + tileGap), foot - (3 * tile + 2 * tileGap) / 2 + Math.floor(k / 3) * (tile + tileGap), tile, tile, 2 * S);
    g.fillStyle = n < lit ? p.level : mix(p.level, p.canvas, .22); g.fill();
  });
  g.fillStyle = p.secondary; g.font = `600 ${12 * S}px ${FONT}`; g.textAlign = 'center';
  g.fillText('sudoclue.app', SHARE_SIZE / 2, 342 * S);
}

export const canvasBlob = (canvas: HTMLCanvasElement) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
