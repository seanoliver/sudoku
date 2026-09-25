import { BOXES, COLUMNS, HOUSES, ROWS, type Candidates } from './deductions.ts';
import { sees, type Step } from './steps.ts';

type Mark = { cell: number; digit: number };
/** One walkthrough line: a sentence and exactly what the board shows with it. */
export type ExplainLine = {
  text: string;
  /** Shaded gray: the row, column, or box the sentence names. */
  house?: readonly number[];
  /** Ringed dark: the cells the sentence is about. */
  focus?: readonly number[];
  /** Ringed red: cells that lose a candidate. */
  target?: readonly number[];
  /** Coloring fills revealed so far: 0 gold, 1 blue. */
  colored?: ReadonlyMap<number, 0 | 1>;
  /** Candidates drawn in front of everything. */
  chips?: readonly Mark[];
  /** Links between `digit` chips; `newest` draws the last pair heavier. */
  links?: { digit: number; pairs: readonly [number, number][]; newest: boolean };
  /** Candidates shown crossed out. */
  strike?: readonly Mark[];
  /** A placement shown as a ghost digit. */
  ghost?: Mark;
};
export type Board = { values: readonly number[]; candidates: Candidates };
/** Longest sentence the panel shows without scrolling at 390px. */
export const EXPLAIN_TEXT_LIMIT = 170;

const SHADE = ['gold', 'blue'] as const;
export function houseName(house: readonly number[]): string {
  const r = ROWS.indexOf(house as number[]), c = COLUMNS.indexOf(house as number[]);
  return r >= 0 ? `row ${r + 1}` : c >= 0 ? `column ${c + 1}` : `box ${BOXES.indexOf(house as number[]) + 1}`;
}
const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
/** "3", "3 and 7", "2, 5, and 8". */
export const list = (items: readonly (number | string)[]) => items.length < 3 ? items.join(' and ') : `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
const chipsFor = (candidates: Candidates, cells: readonly number[], digits: readonly number[]) => cells.flatMap(cell => digits.filter(d => candidates[cell].has(d)).map(digit => ({ cell, digit })));

function coloring(step: Step, { values, candidates }: Board): ExplainLine[] {
  const d = step.digits[0];
  const shade = new Map<number, 0 | 1>([...step.shades![0].map(i => [i, 0] as const), ...step.shades![1].map(i => [i, 1] as const)]);
  const every = chipsFor(candidates, [...Array(81).keys()].filter(i => !values[i]), [d]);
  const linkHouse = new Map<string, readonly number[]>();
  for (const house of HOUSES) {
    const cells = house.filter(i => candidates[i].has(d));
    if (cells.length === 2 && cells.every(i => shade.has(i)) && !linkHouse.has(cells.join())) linkHouse.set(cells.join(), house);
  }
  const start = step.conflict?.[0] ?? step.area[0];
  const colored = new Map<number, 0 | 1>([[start, shade.get(start)!]]);
  const pairs: [number, number][] = [];
  const lines: ExplainLine[] = [];
  for (const queue = [start]; queue.length;) {
    const cell = queue.shift()!;
    for (const [key, house] of linkHouse) {
      const [p, q] = key.split(',').map(Number);
      const next = p === cell ? q : q === cell ? p : -1;
      if (next < 0 || colored.has(next)) continue;
      colored.set(next, shade.get(next)!); pairs.push([cell, next]); queue.push(next);
      const text = pairs.length === 1
        ? `Look only at the ${d}s. ${capital(houseName(house))} has just two places for ${d}, so one is a ${d} and the other isn't. Color them gold and blue.`
        : `${capital(houseName(house))} also has just two places for ${d}. One is ${SHADE[shade.get(cell)!]}, so the other is ${SHADE[shade.get(next)!]}.`;
      lines.push({ text, house, focus: [cell, next], colored: new Map(colored), chips: every, links: { digit: d, pairs: [...pairs], newest: true } });
    }
  }
  const whole = { colored: new Map(colored), chips: every, links: { digit: d, pairs, newest: false } };
  if (step.variant === 'wrap') {
    const [x, y] = step.conflict!;
    const bad = shade.get(x)!, house = HOUSES.find(h => h.includes(x) && h.includes(y))!;
    const places = house.filter(i => candidates[i].has(d)).length;
    return [...lines,
      { ...whole, text: `Every link flips the color, so either all the gold cells are ${d}s or none of them are. The same goes for blue.` },
      { ...whole, house, focus: [x, y], text: `${capital(houseName(house))} has two ${SHADE[bad]} cells, but it can hold only one ${d}. So none of the ${SHADE[bad]} cells are ${d}s.${places > 2 ? ` (With ${places} places for ${d}, it was never a link.)` : ''}` },
      { ...whole, focus: step.shades![bad], strike: step.eliminations, text: `Cross ${d} out of every ${SHADE[bad]} cell. That makes every ${SHADE[1 - bad]} cell a ${d}.` },
    ];
  }
  const trapped = step.eliminations[0].cell;
  return [...lines,
    { ...whole, text: `Every link flips the color, so either all the gold cells are ${d}s or all the blue ones are.` },
    { ...whole, target: [trapped], focus: [step.shades![0].find(i => sees(i, trapped))!, step.shades![1].find(i => sees(i, trapped))!], text: `This cell sees a gold cell and a blue cell. One of them is a ${d} either way, so this cell can't be.` },
    { ...whole, target: step.eliminations.map(e => e.cell), strike: step.eliminations, text: `Cross ${d} out of ${step.eliminations.length > 1 ? 'every cell that sees both colors' : 'this cell'}.` },
  ];
}

const boxOf = (cell: number) => BOXES.find(box => box.includes(cell))!;
const lineOf = (cells: readonly number[]) => [...ROWS, ...COLUMNS].find(line => cells.every(i => line.includes(i)))!;

function nakedSingle(step: Step): ExplainLine[] {
  const { cell, digit } = step.placement!;
  const ruled = step.relies.map(m => m.digit);
  return [
    { focus: [cell, ...step.pattern], strike: step.relies, text: `Every number but ${digit} is already in its row, column, or box${ruled.length ? `, or ruled out here (${list(ruled)})` : ''}.` },
    { focus: [cell], ghost: step.placement, text: `So this cell has to be ${digit}.` },
  ];
}

function hiddenSingle(step: Step, { values }: Board): ExplainLine[] {
  const { cell, digit } = step.placement!;
  const others = step.area.filter(i => !values[i] && i !== cell);
  return [
    { house: step.area, focus: step.pattern, strike: others.map(i => ({ cell: i, digit })), text: `${capital(houseName(step.area))} needs a ${digit}. The ${digit}s already placed nearby rule out every other open cell in it.` },
    { house: step.area, focus: [cell], ghost: step.placement, text: `Only this cell is left, so it's the ${digit}.` },
  ];
}

function locked(step: Step, { candidates }: Board): ExplainLine[] {
  const d = step.digits[0];
  const chips = chipsFor(candidates, step.pattern, [d]);
  const to = step.variant === 'pointing' ? lineOf(step.pattern) : boxOf(step.pattern[0]);
  return [
    { house: step.area, focus: step.pattern, chips, text: `In ${houseName(step.area)}, ${d} fits only in these cells. They're all in ${houseName(to)}.` },
    { house: to, focus: step.pattern, chips, target: step.eliminations.map(e => e.cell), strike: step.eliminations, text: `So ${houseName(step.area)}'s ${d} is in ${houseName(to)}, and the rest of ${houseName(to)} can't hold ${d}.` },
  ];
}

function set(step: Step, { candidates }: Board): ExplainLine[] {
  const n = step.pattern.length, where = houseName(step.area), digits = list(step.digits);
  const chips = chipsFor(candidates, step.pattern, step.digits);
  return step.variant === 'naked' ? [
    { house: step.area, focus: step.pattern, chips, text: `These ${n} cells in ${where} can only hold ${digits}.` },
    { house: step.area, focus: step.pattern, chips, target: [...new Set(step.eliminations.map(e => e.cell))], strike: step.eliminations, text: `Those ${n} numbers must fill these ${n} cells, so no other cell in ${where} can hold them.` },
  ] : [
    { house: step.area, focus: step.pattern, chips, text: `In ${where}, ${digits} fit only in these ${n} cells.` },
    { house: step.area, focus: step.pattern, chips, strike: step.eliminations, text: `So these cells hold ${digits}, and nothing else.` },
  ];
}

function fish(step: Step, { candidates }: Board): ExplainLine[] {
  const d = step.digits[0], { rows, base, cover } = step.fish!;
  const [baseLines, crossLines] = rows ? [ROWS, COLUMNS] : [COLUMNS, ROWS];
  const [baseWord, crossWord] = rows ? ['row', 'column'] : ['column', 'row'];
  const crossNames = `${crossWord}s ${list(cover.map(c => c + 1))}`, covered = cover.flatMap(c => crossLines[c]);
  const chipsIn = (lines: readonly number[]) => chipsFor(candidates, lines.flatMap(b => baseLines[b]), [d]);
  return [
    ...base.map((b, k) => {
      const cells = baseLines[b].filter(i => candidates[i].has(d));
      return { house: baseLines[b], focus: cells, chips: chipsIn(base.slice(0, k + 1)), text: `${capital(baseWord)} ${b + 1} has ${d} only in ${crossWord}s ${list(cells.map(i => (rows ? i % 9 : Math.floor(i / 9)) + 1))}.` };
    }),
    { house: covered, focus: step.pattern, chips: chipsIn(base), text: `Each of these ${base.length} ${baseWord}s needs a ${d}, and together they use only ${crossNames}. So their ${d}s fill ${crossNames}, one each.` },
    { house: covered, focus: step.pattern, chips: chipsIn(base), target: step.eliminations.map(e => e.cell), strike: step.eliminations, text: `No other cell in ${crossNames} can hold ${d}.` },
  ];
}

function xyWing(step: Step, { candidates }: Board): ExplainLine[] {
  const { pivot, wings: [x, y], pivotDigits: [p, q], shared } = step.xyWing!;
  const chips = chipsFor(candidates, [pivot, x, y], [p, q, shared]);
  return [
    { focus: [pivot], chips, text: `This cell, the pivot, can only be ${Math.min(p, q)} or ${Math.max(p, q)}.` },
    { focus: [pivot, x], chips, text: `If the pivot is ${p}, this wing can't be ${p} too, so it's ${shared}.` },
    { focus: [pivot, y], chips, text: `If the pivot is ${q}, this wing can't be ${q} too, so it's ${shared}.` },
    { focus: [x, y], chips, target: step.eliminations.map(e => e.cell), strike: step.eliminations, text: `Either way, one wing is ${shared}. A cell that sees both wings can't be ${shared}.` },
  ];
}

/** The walkthrough for a step on this board; the last line shows the move. */
export function explainStep(step: Step, board: Board): ExplainLine[] {
  switch (step.technique) {
    case 'naked-single': return nakedSingle(step);
    case 'hidden-single': return hiddenSingle(step, board);
    case 'locked-candidates': return locked(step, board);
    case 'pair': case 'triple': case 'quad': return set(step, board);
    case 'x-wing': case 'swordfish': return fish(step, board);
    case 'xy-wing': return xyWing(step, board);
    case 'coloring': return coloring(step, board);
  }
}
