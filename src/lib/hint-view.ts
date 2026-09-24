import type { Hint } from './hints.ts';
import type { Step } from './steps.ts';

export type HintLevel = 1 | 2 | 3;
/** How a cell takes part in a hint: the area to look in, the cells that force the move, the answer, and so on. */
export type HintRole = 'area' | 'pattern' | 'target' | 'relies' | 'struck' | 'mistake' | 'shade-a' | 'shade-b';
export type HintView = {
  /** One short visible line. */
  text: string;
  /** Screen-reader version with exact positions. */
  label: string;
  action: 'next' | 'apply' | 'none';
  levels: 1 | 3;
  cells: Map<number, Set<HintRole>>;
  ghost?: { cell: number; digit: number };
  struck: { cell: number; digit: number }[];
};

const SIZE = { 2: 'pair', 3: 'triple', 4: 'quad' } as Record<number, string>;
const position = (cell: number) => `row ${Math.floor(cell / 9) + 1}, column ${cell % 9 + 1}`;

export function techniqueName(step: Step): string {
  switch (step.technique) {
    case 'naked-single': return 'Naked single';
    case 'hidden-single': return 'Hidden single';
    case 'locked-candidates': return `${step.variant === 'claiming' ? 'Claiming' : 'Pointing'} ${SIZE[step.pattern.length] ?? 'pair'}`;
    case 'pair': case 'triple': case 'quad': return `${step.variant === 'hidden' ? 'Hidden' : 'Naked'} ${step.technique}`;
    case 'x-wing': return 'X-wing';
    case 'swordfish': return 'Swordfish';
    case 'xy-wing': return 'XY-wing';
    case 'coloring': return 'Coloring';
  }
}

/** The area as a house name ("row 3") when it is exactly one row, column or box. */
function houseOf(area: readonly number[]): { kind: 'row' | 'column' | 'box'; number: number } | null {
  if (area.length !== 9) return null;
  const rows = new Set(area.map(i => Math.floor(i / 9))), columns = new Set(area.map(i => i % 9)), boxes = new Set(area.map(i => Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3)));
  if (rows.size === 1) return { kind: 'row', number: [...rows][0] + 1 };
  if (columns.size === 1) return { kind: 'column', number: [...columns][0] + 1 };
  if (boxes.size === 1) return { kind: 'box', number: [...boxes][0] + 1 };
  return null;
}

/** What the hint strip and board show for a hint at a level. Each level adds to the one before. */
export function hintView(hint: Hint, level: HintLevel): HintView {
  const cells = new Map<number, Set<HintRole>>();
  const mark = (cell: number, role: HintRole) => { if (!cells.has(cell)) cells.set(cell, new Set()); cells.get(cell)!.add(role); };
  const view = (text: string, label: string, action: HintView['action'], extra: Partial<HintView> = {}): HintView => ({ text, label, action, levels: 3, cells, struck: [], ...extra });

  if (hint.kind === 'stuck') return view('No hint here', 'No hint is available for this board', 'none', { levels: 1 });
  if (hint.kind === 'solved') return view('Puzzle solved', 'The puzzle is solved', 'none', { levels: 1 });
  if (hint.kind === 'mistake') {
    if (level >= 2) mark(hint.cell, 'mistake');
    if (level === 1) return view('Something’s off', 'Something on the board is not right', 'next');
    if (level === 2) return view('Check this cell', `Check ${position(hint.cell)}`, 'next');
    return hint.digit ? view(`Don’t rule out ${hint.digit}`, `The ${hint.digit} at ${position(hint.cell)} should not be ruled out`, 'apply')
      : view('This number is wrong', `The number at ${position(hint.cell)} is wrong`, 'apply');
  }

  const { step } = hint;
  const name = techniqueName(step);
  if (level === 1) return view(name, name, 'next');
  for (const cell of step.area) mark(cell, 'area');
  const house = houseOf(step.area);
  if (level === 2) {
    const text = house ? `Look in this ${house.kind}` : step.area.length === 1 ? 'Look at this cell' : 'Look at these cells';
    const label = house ? `${name}. Look in ${house.kind} ${house.number}` : `${name}. Look at ${step.area.map(position).join('; ')}`;
    return view(text, label, 'next');
  }
  for (const cell of step.pattern) mark(cell, 'pattern');
  for (const { cell } of step.relies) mark(cell, 'relies');
  if (step.shades) { step.shades[0].forEach(cell => mark(cell, 'shade-a')); step.shades[1].forEach(cell => mark(cell, 'shade-b')); }
  if (step.placement) {
    const { cell, digit } = step.placement;
    mark(cell, 'target');
    return view(`The ${digit} goes here`, `${name}. The ${digit} goes in ${position(cell)}`, 'apply', { ghost: step.placement });
  }
  for (const { cell } of step.eliminations) mark(cell, 'struck');
  const digits = [...new Set(step.eliminations.map(e => e.digit))];
  const text = digits.length === 1 ? `Cross out the ${digits[0]}s` : 'Cross out these';
  const label = `${name}. Cross out ${step.eliminations.map(e => `${e.digit} at ${position(e.cell)}`).join('; ')}`;
  return view(text, label, 'apply', { struck: step.eliminations });
}
