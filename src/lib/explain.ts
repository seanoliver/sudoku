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

/** The walkthrough for a step on this board; the last line shows the move. */
export function explainStep(step: Step, board: Board): ExplainLine[] {
  switch (step.technique) {
    case 'coloring': return coloring(step, board);
    default: return [];
  }
}
