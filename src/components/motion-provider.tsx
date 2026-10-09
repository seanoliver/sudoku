'use client';
import { LazyMotion, MotionConfig, type FeatureBundle } from 'motion/react';
import type { ReactNode } from 'react';

// If the features never arrive (say, offline right after the first render), the app keeps working without motion:
// with no renderer, every m element stays a plain element, as it is before the features load.
const features = () => import('./motion-features').then(module => module.default, (error: unknown) => { console.error('[motion] features failed to load', error); return {} as FeatureBundle; });

/** Loads Motion's layout and drag features after first render, and switches off transform animations for reduced motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={features} strict><MotionConfig reducedMotion="user">{children}</MotionConfig></LazyMotion>;
}
