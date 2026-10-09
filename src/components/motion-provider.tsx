'use client';
import { LazyMotion, MotionConfig, type FeatureBundle } from 'motion/react';
import type { ReactNode } from 'react';

// On a failed load, resolve with no renderer: every m element stays a plain element, and the rejection is handled.
const features = () => import('./motion-features').then(module => module.default, (error: unknown) => { console.error('[motion] features failed to load', error); return {} as FeatureBundle; });

/** Loads Motion's layout and drag features after first render, and switches off transform animations for reduced motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={features} strict><MotionConfig reducedMotion="user">{children}</MotionConfig></LazyMotion>;
}
