export type Side = 'top' | 'right' | 'bottom' | 'left';

/** The sides of each selected cell that do not touch another selected cell, so a group draws one outline. */
export function selectionEdges(indices: readonly number[]): Map<number, Side[]> {
  const selected = new Set(indices);
  const edges = new Map<number, Side[]>();
  for (const index of selected) {
    const row = Math.floor(index / 9), col = index % 9;
    const sides: Side[] = [];
    if (row === 0 || !selected.has(index - 9)) sides.push('top');
    if (col === 8 || !selected.has(index + 1)) sides.push('right');
    if (row === 8 || !selected.has(index + 9)) sides.push('bottom');
    if (col === 0 || !selected.has(index - 1)) sides.push('left');
    edges.set(index, sides);
  }
  return edges;
}
