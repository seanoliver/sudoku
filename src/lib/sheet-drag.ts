export type Sample = { y: number; at: number };

const CLOSE_DISTANCE = 100;
const CLOSE_SPEED = 0.5;

/** Whether letting go closes the sheet: dragged far enough, or moving down fast enough between the last two moves. */
export function closesOnRelease({ distance, previous, last }: { distance: number; previous: Sample; last: Sample }) {
  const speed = (last.y - previous.y) / Math.max(1, last.at - previous.at);
  return distance > CLOSE_DISTANCE || (distance > 0 && speed > CLOSE_SPEED);
}
