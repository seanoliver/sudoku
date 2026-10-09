export type Sample = { y: number; at: number };

const CLOSE_DISTANCE = 100;
const CLOSE_SPEED = 0.5;

/** Whether letting go closes the sheet: dragged past 100px, or moving down faster than 0.5px/ms between the last two moves. */
export function closesOnRelease({ distance, previous, last }: { distance: number; previous: Sample; last: Sample }) {
  const speed = (last.y - previous.y) / Math.max(1, last.at - previous.at);
  return distance > CLOSE_DISTANCE || (distance > 0 && speed > CLOSE_SPEED);
}
