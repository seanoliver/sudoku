/** Named springs shared by every animation, so motion feels the same everywhere. */
export const SPRINGS = {
  snappy: { type: 'spring', stiffness: 700, damping: 50 },
  smooth: { type: 'spring', stiffness: 380, damping: 34 },
  gentle: { type: 'spring', stiffness: 160, damping: 26 },
} as const;
